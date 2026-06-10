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
            send: jest.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
        },
    })),
}));

// Mock Cloudinary storage
jest.unstable_mockModule("../config/cloudinary.js", async () => {
    return {
        cloudinary: {
            config: jest.fn(),
        },
        storage: {
            _handleFile: (req, file, cb) => {
                file.stream.on("data", () => {});
                file.stream.on("end", () => {
                    cb(null, {
                        path: "http://mock-cloudinary.com/image.jpg",
                        size: 1234
                    });
                });
                file.stream.on("error", (err) => cb(err));
            },
            _removeFile: (req, file, cb) => {
                cb(null);
            }
        },
    };
});

// Dynamic imports after mocks
const { default: app } = await import("../app.js");
const { BorrowBook } = await import("../models/borrow.js");
const { Book } = await import("../models/book.js");
const { User } = await import("../models/user.js");
const { Category } = await import("../models/category.js");

jest.setTimeout(10000);

describe("🛡️ Admin Borrow Operations", () => {
    let adminToken;
    let adminUser;
    let testUser;
    let testBook;
    let testCategory;
    let activeBorrowId;
    let overdueBorrowId;
    let returnedBorrowId;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({ email: { $in: ["admin-borrow@test.com", "user-borrow@test.com"] } });
        await Book.deleteMany({ title: "Borrow Test Book" });
        await Category.deleteMany({ title: "Test Category" });
        await BorrowBook.deleteMany({});

        // Setup Admin
        adminUser = await User.create({
            fullName: "Admin Borrow",
            email: "admin-borrow@test.com",
            password: "password123",
            role: "admin"
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );

        // Setup Regular User
        testUser = await User.create({
            fullName: "User Borrow",
            email: "user-borrow@test.com",
            password: "password123",
            role: "user"
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

        // Setup Borrows
        // 1. Active borrow
        const activeBorrow = await BorrowBook.create({
            user: testUser._id,
            book: testBook._id,
            borrow_date: new Date(),
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        });
        activeBorrowId = activeBorrow._id;

        // 2. Overdue borrow
        const overdueBorrow = await BorrowBook.create({
            user: testUser._id,
            book: testBook._id,
            borrow_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),   // 7 days ago
        });
        overdueBorrowId = overdueBorrow._id;

        // 3. Returned borrow
        const returnedBorrow = await BorrowBook.create({
            user: testUser._id,
            book: testBook._id,
            borrow_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            due_date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
            return_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        });
        returnedBorrowId = returnedBorrow._id;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("GET /api/admin/borrows", () => {
        it("Should return all borrow records", async () => {
            const res = await request(app)
                .get("/api/admin/borrows")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
            expect(res.body).toHaveProperty("totalItems");
        });
    });

    describe("GET /api/admin/borrows/active", () => {
        it("Should return only active borrows", async () => {
            const res = await request(app)
                .get("/api/admin/borrows/active")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            // Should find at least activeBorrow and overdueBorrow (since overdue is also active if not returned)
            // Actually check controllers/admin/borrow.js: getActiveBorrows query: { return_date: { $exists: false } }
            const activeIds = res.body.data.map(b => b._id.toString());
            expect(activeIds).toContain(activeBorrowId.toString());
            expect(activeIds).toContain(overdueBorrowId.toString());
            expect(activeIds).not.toContain(returnedBorrowId.toString());
        });
    });

    describe("GET /api/admin/borrows/overdue", () => {
        it("Should return only overdue borrows", async () => {
            const res = await request(app)
                .get("/api/admin/borrows/overdue")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            const overdueIds = res.body.data.map(b => b._id.toString());
            expect(overdueIds).toContain(overdueBorrowId.toString());
            expect(overdueIds).not.toContain(activeBorrowId.toString());
            expect(overdueIds).not.toContain(returnedBorrowId.toString());
        });
    });

    describe("GET /api/admin/borrows/:id/history", () => {
        it("Should return borrow history for a specific user", async () => {
            const res = await request(app)
                .get(`/api/admin/borrows/${testUser._id}/history`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
            expect(res.body.data[0].user._id.toString()).toBe(testUser._id.toString());
        });

        it("Should return 400 for invalid user ID", async () => {
            const res = await request(app)
                .get("/api/admin/borrows/invalid-id/history")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /api/admin/borrows/:id", () => {
        it("Should return a specific borrow record", async () => {
            const res = await request(app)
                .get(`/api/admin/borrows/${activeBorrowId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data._id.toString()).toBe(activeBorrowId.toString());
            expect(res.body.data).toHaveProperty("book");
            expect(res.body.data).toHaveProperty("user");
        });

        it("Should return 404 for non-existent borrow ID", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/borrows/${fakeId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("DELETE /api/admin/borrows/:id", () => {
        it("Should delete a borrow record", async () => {
            const res = await request(app)
                .delete(`/api/admin/borrows/${returnedBorrowId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Borrow record deleted successfully");

            const check = await BorrowBook.findById(returnedBorrowId);
            expect(check).toBeNull();
        });

        it("Should return 404 when deleting non-existent record", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/admin/borrows/${fakeId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("Security - Admin Only", () => {
        it("Should reject regular user from accessing admin borrow routes", async () => {
            const userToken = Jwt.sign(
                { _id: testUser._id, role: "user" },
                process.env.JWT_ACCESS_SECRET
            );

            const res = await request(app)
                .get("/api/admin/borrows")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(403);
        });

        it("Should reject unauthenticated access", async () => {
            const res = await request(app)
                .get("/api/admin/borrows");

            expect(res.statusCode).toBe(401);
        });
    });
});
