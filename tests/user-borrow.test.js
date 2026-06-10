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

jest.setTimeout(15000);

describe("📖 User Borrow Operations", () => {
    let userToken;
    let testUser;
    let testCategory;
    let testBook;
    let testBorrowId;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({ email: /borrow-test/ });
        await Category.deleteMany({ title: "User Borrow Category" });
        await Book.deleteMany({ title: /User Borrow Book/ });
        await BorrowBook.deleteMany({});

        // 1. Setup User
        testUser = await User.create({
            fullName: "Borrow Test User",
            email: "user-borrow-test@test.com",
            password: "password123",
            role: "user",
            subscribed: true
        });

        userToken = Jwt.sign(
            { _id: testUser._id, role: "user" },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );

        // 2. Setup Category
        testCategory = await Category.create({
            title: "User Borrow Category",
            description: "Category for user borrowing tests"
        });

        // 3. Setup Book
        testBook = await Book.create({
            title: "User Borrow Book",
            isbn: "3333333333333",
            author: ["Author Test"],
            category: [testCategory._id],
            description: "Description",
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

    describe("POST /api/user/borrows/:id/borrow", () => {
        it("Should allow a user to borrow a book", async () => {
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/borrow`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Book borrowed successfully");
            testBorrowId = res.body.borrow._id;

            // Verify availability decreased
            const updatedBook = await Book.findById(testBook._id);
            expect(updatedBook.copies_available).toBe(1);
        });

        it("Should fail if user already borrowed this book", async () => {
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/borrow`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You have already borrowed this book");
        });

        it("Should fail if book is out of stock", async () => {
            // Borrow the last copy first
            const otherUser = await User.create({
                fullName: "Other User",
                email: "other-borrow-test@test.com",
                password: "password123",
                role: "user"
            });
            const otherToken = Jwt.sign({ _id: otherUser._id, role: "user" }, process.env.JWT_ACCESS_SECRET);

            await request(app)
                .post(`/api/user/borrows/${testBook._id}/borrow`)
                .set("Cookie", [`accessToken=${otherToken}`]);

            // Now try again
            const res = await request(app)
                .post(`/api/user/borrows/${testBook._id}/borrow`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Book is unavailable.");
        });

        it("Should fail if user has reached monthly limit (3 books)", async () => {
            // Setup a user who already borrowed 3 books this month
            const limitUser = await User.create({
                fullName: "Limit User",
                email: "limit-borrow-test@test.com",
                password: "password123",
                role: "user"
            });
            const limitToken = Jwt.sign({ _id: limitUser._id, role: "user" }, process.env.JWT_ACCESS_SECRET);

            const book2 = await Book.create({ title: "Book 2", isbn: "222", author: ["A"], category: [testCategory._id], description: "D", copies_available: 10, pages: 10, language: "English", publication_year: 2020, cover_image: "img" });
            const book3 = await Book.create({ title: "Book 3", isbn: "333", author: ["A"], category: [testCategory._id], description: "D", copies_available: 10, pages: 10, language: "English", publication_year: 2020, cover_image: "img" });
            const book4 = await Book.create({ title: "Book 4", isbn: "444", author: ["A"], category: [testCategory._id], description: "D", copies_available: 10, pages: 10, language: "English", publication_year: 2020, cover_image: "img" });
            const book5 = await Book.create({ title: "Book 5", isbn: "555", author: ["A"], category: [testCategory._id], description: "D", copies_available: 10, pages: 10, language: "English", publication_year: 2020, cover_image: "img" });

            await BorrowBook.create([
                { user: limitUser._id, book: book2._id, borrow_date: new Date(), due_date: new Date() },
                { user: limitUser._id, book: book3._id, borrow_date: new Date(), due_date: new Date() },
                { user: limitUser._id, book: book4._id, borrow_date: new Date(), due_date: new Date() }
            ]);

            const res = await request(app)
                .post(`/api/user/borrows/${book5._id}/borrow`)
                .set("Cookie", [`accessToken=${limitToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You have already borrowed 3 books this month");
        });
    });

    describe("PATCH /api/user/borrows/:id/renew", () => {
        it("Should allow renewal of a borrowed book", async () => {
            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Borrow renewed for 7 more days");
            expect(res.body.borrow.renewed).toBe(true);
        });

        it("Should fail if maximum renewals reached", async () => {
            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("The maximum number of renewals has been reached");
        });

        it("Should fail if book is overdue", async () => {
            const overdueBorrow = await BorrowBook.create({
                user: testUser._id,
                book: testBook._id,
                borrow_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            });

            const res = await request(app)
                .patch(`/api/user/borrows/${overdueBorrow._id}/renew`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Cannot renew a late book. Please return it first.");
        });
    });

    describe("PATCH /api/user/borrows/:id/return", () => {
        it("Should allow user to return a book", async () => {
            const res = await request(app)
                .patch(`/api/user/borrows/${testBorrowId}/return`)
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("The book was successfully returned");

            const updatedBook = await Book.findById(testBook._id);
            expect(updatedBook.copies_available).toBe(1); // One was returned, but one was borrowed by 'otherUser'
        });

        it("Should handle late return with suspension (over 3 days)", async () => {
            const lateUser = await User.create({
                fullName: "Late User",
                email: "late-borrow-test@test.com",
                password: "password123",
                role: "user"
            });
            const lateToken = Jwt.sign({ _id: lateUser._id, role: "user" }, process.env.JWT_ACCESS_SECRET);

            const lateBorrow = await BorrowBook.create({
                user: lateUser._id,
                book: testBook._id,
                borrow_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
                due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
            });

            const res = await request(app)
                .patch(`/api/user/borrows/${lateBorrow._id}/return`)
                .set("Cookie", [`accessToken=${lateToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Book returned, but you are suspended for 10 days due to delay.");

            const updatedUser = await User.findById(lateUser._id);
            expect(updatedUser.suspension_date).toBeDefined();
        });
    });

    describe("GET /api/user/borrows/history", () => {
        it("Should return user borrowing history", async () => {
            const res = await request(app)
                .get("/api/user/borrows/history")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });
});
