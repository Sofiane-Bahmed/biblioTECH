import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { jest } from "@jest/globals";

import { User } from "../../models/user.js";
import { Book } from "../../models/book.js";
import { Borrow } from "../../models/borrow.js";
import { AuditLog } from "../../models/audit-log.js";
import { librarianBorrowRouter } from "../../routers/librarian/borrow.js";

// Mock email utilities to prevent actual sends and missing API key errors
jest.mock("../../utils/email/pickup-ready.js", () => ({
    sendPickupReadyEmail: jest.fn().mockResolvedValue(true as never),
}));

jest.mock("../../utils/email/hold-ready-email.js", () => ({
    sendHoldReadyEmail: jest.fn().mockResolvedValue(true as never),
}));

jest.mock("../../utils/email/suspension-warning.ts", () => ({
    sendSuspensionWarningEmail: jest.fn().mockResolvedValue(true as never),
}));

// Mock auth middleware to inject staff user into req.user
jest.mock("../../middlewares/validate.js", () => ({
    validate: () => (req: any, res: any, next: any) => next(),
}));

let mongoServer: MongoMemoryReplSet;
let app: express.Application;
let staffId: mongoose.Types.ObjectId;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());

    // Inject mock staff user context into all requests
    staffId = new mongoose.Types.ObjectId();
    app.use((req: any, _res, next) => {
        req.user = { _id: staffId.toString(), role: "librarian" };
        next();
    });

    app.use("/api/librarian/borrows", librarianBorrowRouter);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
    await Book.deleteMany({});
    await Borrow.deleteMany({});
    await AuditLog.deleteMany({});
});

describe("Librarian Borrow Router Integration Tests", () => {
    let userId: mongoose.Types.ObjectId;
    let bookId: mongoose.Types.ObjectId;
    let borrowId: mongoose.Types.ObjectId;

    beforeEach(async () => {
        // 1. Seed Standard User
        userId = new mongoose.Types.ObjectId();
        await User.create({
            _id: userId,
            fullName: "John Doe",
            email: "john@example.com",
            role: "user",
            password: "Password123!",
            subscribed: false,
            outstanding_fines: 50.0,
        });

        // 2. Seed Book
        bookId = new mongoose.Types.ObjectId();
        await Book.create({
            _id: bookId,
            title: "Clean Code",
            author: ["Robert C. Martin"],
            description: "A handbook of agile software craftsmanship",
            copies_available: 5,
            pages: 464,
            language: "English",
            publication_year: 2008,
            cover_image: "https://example.com/clean-code.jpg",
            isbn: "978-0132350884",
            category: [],
        });

        // 3. Seed Base Borrow Record
        borrowId = new mongoose.Types.ObjectId();
        await Borrow.create({
            _id: borrowId,
            user: userId,
            book: bookId,
            status: "PENDING",
        });
    });

    describe("GET /api/librarian/borrows", () => {
        it("should retrieve a paginated list of borrow records", async () => {
            const res = await request(app)
                .get("/api/librarian/borrows");

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
        });
    });

    describe("POST /api/librarian/borrows/bypass-queue", () => {
        it("should issue a book directly to a user bypassing normal wait time", async () => {
            const res = await request(app)
                .post("/api/librarian/borrows/bypass-queue")
                .send({
                    userId: userId.toString(),
                    bookId: bookId.toString(),
                    reason: "VIP Request",
                });

            expect([200, 201]).toContain(res.status);
            expect(res.body.status).toBe(true);
        });
    });

    describe("PATCH /api/librarian/borrows/:borrowId/approve", () => {
        it("should approve a pending borrow request and update book copies", async () => {
            const res = await request(app)
                .patch(`/api/librarian/borrows/${borrowId}/approve`)
                .send({ approved_message: "Ready for pickup" });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.status).toBe("APPROVED");
        });
    });

    describe("PATCH /api/librarian/borrows/:borrowId/reject", () => {
        it("should reject a borrow request with reason", async () => {
            const res = await request(app)
                .patch(`/api/librarian/borrows/${borrowId}/reject`)
                .send({ rejected_message: "Item unavailable" });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.status).toBe("REJECTED");
        });
    });

    describe("PATCH /api/librarian/borrows/:borrowId/confirm-handover", () => {
        it("should set status to active when book is handed over", async () => {
            // First approve the borrow
            await Borrow.findByIdAndUpdate(borrowId, { status: "APPROVED" });

            const res = await request(app)
                .patch(`/api/librarian/borrows/${borrowId}/confirm-handover`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.status).toBe("ACTIVE");
        });

        it("should fail if borrow is not in APPROVED status", async () => {
            const res = await request(app)
                .patch(`/api/librarian/borrows/${borrowId}/confirm-handover`);

            expect(res.status).toBe(400);
            expect(res.body.status).toBe(false);
        });
    });

    describe("PATCH /api/librarian/borrows/:borrowId/return-book", () => {
        it("should process book return", async () => {
            // Set borrow to ACTIVE status for return
            await Borrow.findByIdAndUpdate(borrowId, {
                status: "ACTIVE",
                borrow_date: new Date(),
                due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
                issued_by: staffId,
            });

            const res = await request(app)
                .patch(`/api/librarian/borrows/${borrowId}/return-book`)
                .send({ condition: "GOOD" });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
        });
    });

    describe("PATCH /api/librarian/borrows/:userId/pay-fine", () => {
        it("should reduce user outstanding fine balance", async () => {
            const res = await request(app)
                .patch(`/api/librarian/borrows/${userId}/pay-fine`)
                .send({ amountPaid: 20.0 });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.remainingBalance).toBe(30.0);
        });
    });

    describe("GET /api/librarian/borrows/:borrowId", () => {
        it("should fetch details of a single borrow record", async () => {
            const res = await request(app)
                .get(`/api/librarian/borrows/${borrowId}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.borrow._id.toString()).toBe(borrowId.toString());
        });
    });

    describe("DELETE /api/librarian/borrows/:borrowId", () => {
        it("should remove borrow entry", async () => {
            const res = await request(app)
                .delete(`/api/librarian/borrows/${borrowId}`);

            expect(res.status).toBe(200);
            expect(res.body.status).toBe(true);
        });
    });
});
