import request from "supertest";
import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

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
            send: jest.fn().mockImplementation(() =>
                Promise.resolve({ data: { id: "test-id" }, error: null })
            ),
        },
    })),
}));

// Mock Cloudinary storage
jest.unstable_mockModule("../../config/cloudinary.js", async () => {
    return {
        cloudinary: {
            config: jest.fn(),
        },
        storage: {
            // Explicit parameter typing to satisfy compiler layout
            _handleFile: (req: any, file: any, cb: any) => {
                file.stream.on("data", () => { });
                file.stream.on("end", () => {
                    cb(null, {
                        path: "http://mock-cloudinary.com/image.jpg",
                        size: 1234
                    });
                });
                file.stream.on("error", (err: Error) => cb(err));
            },
            _removeFile: (req: any, file: any, cb: any) => {
                cb(null);
            }
        },
    };
});

// Dynamic imports after mocks
const { default: app } = await import("../../app.js");
const { Borrow } = await import("../../models/borrow.js");
const { Book } = await import("../../models/book.js");
const { User } = await import("../../models/user.js");
const { Category } = await import("../../models/category.js");

jest.setTimeout(15000);

describe("🛡️ Admin Borrow Operations", () => {
    let adminToken: string;
    let adminUser: any;
    let testUser: any;
    let testBook: any;
    let testCategory: any;

    let activeBorrowId: mongoose.Types.ObjectId;
    let overdueBorrowId: mongoose.Types.ObjectId;
    let returnedBorrowId: mongoose.Types.ObjectId;
    let pendingBorrowId: mongoose.Types.ObjectId;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // Comprehensive system cleanup
        await User.deleteMany({});
        await Book.deleteMany({});
        await Category.deleteMany({});
        await Borrow.deleteMany({});

        // Setup Admin
        adminUser = await User.create({
            fullName: "Admin Borrow",
            email: "admin-borrow@test.com",
            password: "password123",
            role: "admin",
            subscribed: true
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET!,
            { expiresIn: "1h" }
        );

        // Setup Regular User
        testUser = await User.create({
            fullName: "User Borrow",
            email: "user-borrow@test.com",
            password: "password123",
            role: "user",
            subscribed: true
        });

        // Setup Category
        testCategory = await Category.create({
            title: "Test Category",
            description: "Category for testing"
        });

        // Setup Book
        testBook = await Book.create({
            title: "Borrow Test Book",
            isbn: "1234567890123",
            author: ["Author Test"],
            category: [testCategory._id],
            description: "Description",
            copies_available: 5,
            pages: 100,
            language: "English",
            publication_year: 2021,
            cover_image: "http://mock-cloudinary.com/image.jpg"
        });

        // 1. Setup Active Borrow
        const activeBorrow = await Borrow.create({
            user: testUser._id,
            book: testBook._id,
            status: "ACTIVE",
            borrow_date: new Date(),
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        activeBorrowId = activeBorrow._id;

        // 2. Setup Overdue Borrow
        const overdueBorrow = await Borrow.create({
            user: testUser._id,
            book: testBook._id,
            status: "ACTIVE",
            borrow_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        });
        overdueBorrowId = overdueBorrow._id;

        // 3. Setup Returned Borrow
        const returnedBorrow = await Borrow.create({
            user: testUser._id,
            book: testBook._id,
            status: "RETURNED",
            borrow_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            due_date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            return_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        });
        returnedBorrowId = returnedBorrow._id;

        // 4. Setup Pending Borrow for transaction tests
        const pendingBorrow = await Borrow.create({
            user: testUser._id,
            book: testBook._id,
            status: "PENDING",
            request_date: new Date()
        });
        pendingBorrowId = pendingBorrow._id;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // --- GET /api/admin/borrows Tests ---
    describe("GET /api/admin/borrows", () => {
        it("Should return all borrow records with pagination parameters", async () => {
            const res = await request(app)
                .get("/api/admin/borrows")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.length).toBeGreaterThanOrEqual(4);
        });

        it("Should accurately query and return active records only", async () => {
            const res = await request(app)
                .get("/api/admin/borrows?status=ACTIVE")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            const statuses = res.body.data.map((b: any) => b.status);
            expect(statuses.every((s: string) => s === "ACTIVE")).toBe(true);
        });

        it("Should return overdue items using date constraint logic queries", async () => {
            const res = await request(app)
                .get("/api/admin/borrows?overdue=true")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            const foundIds = res.body.data.map((b: any) => b._id.toString());
            expect(foundIds).toContain(overdueBorrowId.toString());
            expect(foundIds).not.toContain(activeBorrowId.toString());
        });
    });

    // --- PATCH/PUT Action Approval Flow Tests ---
    describe("PATCH /api/admin/borrows/:borrowId/approve", () => {
        it("Should successfully transition pending record to active and deduct book inventory", async () => {
            // Target the endpoint matching your express router layout setup
            const res = await request(app)
                .patch(`/api/admin/borrows/${pendingBorrowId}/approve`)
                .send({ approved_message: "Your request has been approved!" })
                .set("Cookie", [`accessToken=${adminToken}`]);

            if (res.statusCode !== 200) {
                console.error("Failed with body:", res.body);
            }

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.borrow.status).toBe("ACTIVE");
            expect(res.body.borrow.approved_message).toBe("Your request has been approved!");

            // Verify secondary database modifications handled inside your ACID session transaction block
            const updatedBook = await Book.findById(testBook._id);
            expect(updatedBook!.copies_available).toBe(4); // Decremented from 5 to 4
        });

        it("Should fail gracefully when target borrow request is not pending anymore", async () => {
            const res = await request(app)
                .patch(`/api/admin/borrows/${activeBorrowId}/approve`)
                .send({ approved_message: "Your request has been approved!" })
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Borrow request not found or has already been processed.");
        });
    });

    // --- GET History for target user ---
    describe("GET /api/admin/borrows/:userId/history", () => {
        it("Should return full matching log stack data for specific subscriber", async () => {
            const res = await request(app)
                .get(`/api/admin/borrows/${testUser._id}/history`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
        });
    });

    // --- GET Single Record Operations ---
    describe("GET /api/admin/borrows/:borrowId", () => {
        it("Should fetch structural item populated with user and book data structures", async () => {
            const res = await request(app)
                .get(`/api/admin/borrows/${activeBorrowId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id.toString()).toBe(activeBorrowId.toString());
            expect(res.body.data.user).toHaveProperty("fullName");
            expect(res.body.data.book).toHaveProperty("title");
        });
    });

    // --- DELETE Cleanups ---
    describe("DELETE /api/admin/borrows/:borrowId", () => {
        it("Should drop operational documentation row upon execution", async () => {
            const res = await request(app)
                .delete(`/api/admin/borrows/${returnedBorrowId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            const validationInstance = await Borrow.findById(returnedBorrowId);
            expect(validationInstance).toBeNull();
        });
    });

    // --- Global Access Control and Security Isolation Layer Tests ---
    describe("Security - Access Isolation Policies", () => {
        it("Should block plain consumer profiles completely", async () => {
            const lowPrivilegeToken = Jwt.sign(
                { _id: testUser._id, role: "user" },
                process.env.JWT_ACCESS_SECRET!
            );

            const res = await request(app)
                .get("/api/admin/borrows")
                .set("Cookie", [`accessToken=${lowPrivilegeToken}`]);

            expect(res.statusCode).toBe(403);
        });
    });
});