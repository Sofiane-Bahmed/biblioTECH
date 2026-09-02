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

// Dynamic imports after mocks to guarantee type loading resolution order
const { default: app } = await import("../../app.js");
const { Borrow } = await import("../../models/borrow.js");
const { Book } = await import("../../models/book.js");
const { User } = await import("../../models/user.js");
const { Category } = await import("../../models/category.js");

jest.setTimeout(15000);

describe("📊 Admin Analytics Operations", () => {
    let adminToken: string;
    let adminUser: any;
    let testUser1: any;
    let testUser2: any;
    let testCategory: any;
    let testBookInStock: any;
    let testBookOutOfStock: any;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // Comprehensive Cleanup to ensure accurate counts
        await User.deleteMany({});
        await Category.deleteMany({});
        await Book.deleteMany({});
        await Borrow.deleteMany({});

        // 1. Setup Admin
        adminUser = await User.create({
            fullName: "Admin Stats",
            email: "admin-stats@test.com",
            password: "password123",
            role: "admin",
            subscribed: true
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET!,
            { expiresIn: "1h" }
        );

        // 2. Setup Users
        testUser1 = await User.create({
            fullName: "User One",
            email: "user1-stats@test.com",
            password: "password123",
            role: "user",
            subscribed: true
        });

        testUser2 = await User.create({
            fullName: "User Two",
            email: "user2-stats@test.com",
            password: "password123",
            role: "user",
            subscribed: true
        });

        // 3. Setup Category
        testCategory = await Category.create({
            title: "Stats Category",
            description: "Category for statistics testing"
        });

        // 4. Setup Books
        testBookInStock = await Book.create({
            title: "Stats Book In Stock",
            isbn: "1111111111111",
            author: ["Author One"],
            category: [testCategory._id],
            description: "Description",
            copies_available: 5,
            pages: 100,
            language: "English",
            publication_year: 2021,
            cover_image: "http://mock-cloudinary.com/image.jpg"
        });

        testBookOutOfStock = await Book.create({
            title: "Stats Book Out Of Stock",
            isbn: "2222222222222",
            author: ["Author Two"],
            category: [testCategory._id],
            description: "Description",
            copies_available: 0,
            pages: 200,
            language: "French",
            publication_year: 2022,
            cover_image: "http://mock-cloudinary.com/image.jpg"
        });

        // 5. Setup Borrows aligned explicitly with state statuses
        // Active loan
        await Borrow.create({
            user: testUser1._id,
            book: testBookInStock._id,
            status: "ACTIVE", // <-- Updated
            request_date: new Date(),
            borrow_date: new Date(),
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        // Overdue loan
        await Borrow.create({
            user: testUser2._id,
            book: testBookInStock._id,
            status: "ACTIVE", // <-- Updated
            request_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            borrow_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        });

        // Returned loan
        await Borrow.create({
            user: testUser1._id,
            book: testBookOutOfStock._id,
            status: "RETURNED", // <-- Updated
            request_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            borrow_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            due_date: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
            return_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("GET /api/admin/stats", () => {
        it("Should return correct library statistics", async () => {
            const res = await request(app)
                .get("/api/admin/stats")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);

            // Access properties inside res.body.data
            const { summaryCards, charts, leaderboards } = res.body.data;

            // Verify Summary Cards
            expect(summaryCards.totalBooks).toBe(2);
            expect(summaryCards.totalUsers).toBe(3); // admin + 2 test users
            expect(summaryCards.activeLoans).toBe(2);
            expect(summaryCards.overdueLoans).toBe(1);
            expect(summaryCards.outOfStockAlerts).toBe(1);

            // Verify Charts
            expect(charts.genreDistribution).toBeDefined();
            const categoryStats = charts.genreDistribution.find(
                (c: any) => c.categoryName === "Stats Category"
            );
            expect(categoryStats).toBeDefined();
            expect(categoryStats.borrowCount).toBe(3);

            // Verify Leaderboards
            expect(leaderboards.powerUsers).toBeDefined();
            expect(leaderboards.powerUsers.length).toBeGreaterThanOrEqual(2);

            const topUser = leaderboards.powerUsers.find(
                (u: any) => u.email === "user1-stats@test.com"
            );
            expect(topUser).toBeDefined();
            expect(topUser.borrowCount).toBe(2);
        });

        it("Should reject non-admin access", async () => {
            const userToken = Jwt.sign(
                { _id: testUser1._id, role: "user" },
                process.env.JWT_ACCESS_SECRET!
            );

            const res = await request(app)
                .get("/api/admin/stats")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(403);
        });
    });
});