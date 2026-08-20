import request from "supertest";
import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

import { BORROWING_RULES } from "../../constants/library-rules.js";

const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES;

// Mocking external services
jest.unstable_mockModule("axios", () => ({
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    }
}));

jest.unstable_mockModule("resend", () => ({
    Resend: jest.fn().mockImplementation(() => ({
        emails: {
            send: jest.fn().mockImplementation(() => Promise.resolve({ data: { id: "test-id" }, error: null })),
        },
    })),
}));

jest.unstable_mockModule("../../config/cloudinary.js", async () => {
    return {
        cloudinary: { config: jest.fn() },
        storage: {
            _handleFile: (req: any, file: any, cb: any) => {
                file.stream.on("data", () => { });
                file.stream.on("end", () => {
                    cb(null, { path: "http://mock-cloudinary.com/image.jpg", size: 1234 });
                });
                file.stream.on("error", (err: Error) => cb(err));
            },
            _removeFile: (req: any, file: any, cb: any) => { cb(null); }
        },
    };
});

// Dynamic imports after module mocks executed
const { default: app } = await import("../../app.js");
const { Borrow } = await import("../../models/borrow.js");
const { Book } = await import("../../models/book.js");
const { User } = await import("../../models/user.js");
const { Category } = await import("../../models/category.js");
const { Reservation } = await import("../../models/reservation.js");

jest.setTimeout(15000);

describe("📖 User Borrow Operations", () => {
    let userToken: string;
    let testUser: any;
    let testCategory: any;
    let testBook: any;
    let testBorrowId: string;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // Isolate environment records safely
        await User.deleteMany({ email: /borrow-test/ });
        await Category.deleteMany({ title: "User Borrow Category" });
        await Book.deleteMany({ title: /User Borrow Book/ });
        await Borrow.deleteMany({});
        await Reservation.deleteMany({});

        testUser = await User.create({
            fullName: "Borrow Test User",
            email: "user-borrow-test@test.com",
            password: "password123",
            role: "user",
            subscribed: true
        });

        userToken = Jwt.sign(
            { _id: testUser._id, role: "user" },
            process.env.JWT_ACCESS_SECRET!,
            { expiresIn: "1h" }
        );

        testCategory = await Category.create({
            title: "User Borrow Category",
            description: "Category for user borrowing tests"
        });

        testBook = await Book.create({
            title: "User Borrow Book",
            isbn: "3333333333333",
            author: ["Author Test"],
            category: [testCategory._id],
            description: "Description Details",
            copies_available: 2,
            pages: 150,
            language: "English",
            publication_year: 2023,
            cover_image: "http://mock-cloudinary.com/image.jpg"
        });
    });

    afterAll(async () => {
        await User.deleteMany({ email: /borrow-test/ });
        await Category.deleteMany({ title: "User Borrow Category" });
        await Book.deleteMany({ title: /User Borrow Book/ });
        await Borrow.deleteMany({});
        await Reservation.deleteMany({});
        await mongoose.connection.close();
    });

    // --- POST /api/user/borrows/:bookId/request ---
    describe("POST /api/user/borrows/:bookId/request", () => {
        it("Should allow a user to submit a pending borrow request", async () => {
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/request`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe(true);
            expect(res.body.message).toBe("Borrow request submitted successfully and is awaiting staff approval.");
            expect(res.body.data.type).toBe("BORROW");
            expect(res.body.data.borrow.status).toBe("PENDING");

            testBorrowId = res.body.data.borrow._id;
        });

        it("Should fail if a user already has a pending request matching the targeted book criteria", async () => {
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/request`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe(false);
        });
    });

    // --- PATCH /api/user/borrows/:borrowId/renew ---
    describe("PATCH /api/user/borrows/:borrowId/renew", () => {
        beforeEach(async () => {
            await Borrow.findByIdAndUpdate(testBorrowId, {
                $set: {
                    status: "ACTIVE",
                    book: testBook._id,
                    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    renewed: false
                }
            });
        });

        it("Should extend runtime due date parameters given valid parameters", async () => {
            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.message).toContain("Book renewal approved");
            expect(res.body.data.borrow.renewed).toBe(true);
        });

        it("Should fail validation gates if maximum allowed iteration limits are crossed", async () => {
            await Borrow.findByIdAndUpdate(testBorrowId, { $set: { renewed: true } });

            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toBe("The maximum number of renewals (1) has been reached for this loan.");
        });

        it("Should reject renewal transactions if dates are past the validation threshold", async () => {
            await Borrow.findByIdAndUpdate(testBorrowId, {
                $set: {
                    renewed: false,
                    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 Days late
                }
            });

            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toBe("Cannot renew an overdue book. Please return it to the library to settle any late fees.");
        });
    });

    // --- PATCH /api/user/borrows/:borrowId/cancel ---
    describe("PATCH /api/user/borrows/:borrowId/cancel", () => {
        it("Should allow a user to cancel a pending borrow request", async () => {
            // Reset state to PENDING
            await Borrow.findByIdAndUpdate(testBorrowId, {
                $set: { status: "PENDING" }
            });

            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/cancel`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.message).toBe("Your borrow request has been cancelled successfully.");
            expect(res.body.data.request.status).toBe("CANCELED");
        });

        it("Should return 400 when attempting to cancel an already processed/active request", async () => {
            await Borrow.findByIdAndUpdate(testBorrowId, {
                $set: { status: "ACTIVE" }
            });

            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/cancel`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toContain("Cannot cancel this borrow request");
        });

        it("Should return 404 if the request or reservation ID does not exist", async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();

            const res = await request(app)
                .patch(`/api/user/borrows/${nonExistentId}/cancel`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(404);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toBe("Request or reservation not found.");
        });
    });
});