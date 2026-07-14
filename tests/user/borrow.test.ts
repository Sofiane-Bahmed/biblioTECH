import request from "supertest";
import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

import { BORROWING_RULES } from "../../constants/library-rules.js";

const { RENEWAL_DAYS_EXTENSION } = BORROWING_RULES

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
        await mongoose.connection.close();
    });

    // --- POST /api/user/borrows/:bookId/request ---
    describe("POST /api/user/borrows/:bookId/request", () => {
        it("Should allow a user to submit a pending borrow request", async () => {
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/request`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Your borrow request has been submitted successfully and is awaiting admin approval.");
            expect(res.body.request.status).toBe("PENDING");

            testBorrowId = res.body.request._id;
        });

        it("Should fail if a user already has a pending request matching the targeted book criteria", async () => {
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/request`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You already have a pending request for this book.");
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
            expect(res.body.message).toContain("Book renewal approved");
            expect(res.body.borrow.renewed).toBe(true);
        });

        it("Should fail validation gates if maximum allowed iteration limits are crossed", async () => {
            await Borrow.findByIdAndUpdate(testBorrowId, { $set: { renewed: true } });

            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("The maximum number of renewals (1) has been reached.");
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
            expect(res.body.message).toBe("Cannot renew a late book. Please return it to inventory first.");
        });
    });

    // --- PATCH /api/user/borrows/:borrowId/return ---
    describe("PATCH /api/user/borrows/:borrowId/return", () => {
        beforeEach(async () => {
            await Borrow.findByIdAndUpdate(testBorrowId, {
                $set: {
                    status: "ACTIVE",
                    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                }
            });
        });

        it("Should safely alter user references and inventory stock metrics inside transaction sessions", async () => {
            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/return`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const checkedBook = await Book.findById(testBook._id);
            expect(checkedBook!.copies_available).toBeGreaterThan(0);
        });

        it("Should seamlessly invoke penalty rules engine arrays and flag temporal accounts suspensions if delay dates match thresholds", async () => {
            const lateUser = await User.create({
                fullName: "Late System User",
                email: "delinquent-borrow-test@test.com",
                password: "password123",
                role: "user"
            });
            const lateToken = Jwt.sign({ _id: lateUser._id, role: "user" }, process.env.JWT_ACCESS_SECRET!);

            const lateBorrow = await Borrow.create({
                user: lateUser._id,
                book: testBook._id,
                status: "ACTIVE",
                borrow_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
                due_date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
            });

            const res = await request(app)
                .patch(`/api/user/borrows/${lateBorrow._id}/return`)
                .set("Cookie", [`accessToken=${lateToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const updatedUser = await User.findById(lateUser._id);
            expect(updatedUser!.suspension_date).toBeDefined();
        });
    });
});