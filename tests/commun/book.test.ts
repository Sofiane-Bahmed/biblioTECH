import request from "supertest";
import mongoose from "mongoose";

import app from "../../app.js";
const { Book } = await import("../../models/book.js");
const { Category } = await import("../../models/category.js");

describe("📚 Backend Readiness & Quality Assurance - Book Router", () => {
    let testBookId: string;
    let testCategory: any;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        await Book.deleteMany({});
        await Category.deleteMany({});

        testCategory = await Category.findOneAndUpdate(
            { title: "Test Category" },
            { title: "Test Category", description: "Test Description" },
            { upsert: true, new: true }
        );

        const testBook = await Book.findOneAndUpdate(
            { isbn: "1234567890" },
            {
                title: "Test Book",
                author: ["Test Author"],
                isbn: "1234567890",
                description: "This is a test book description that is long enough.",
                copies_available: 5,
                pages: 200,
                language: "English",
                publication_year: 2021,
                category: [testCategory._id],
                cover_image: "http://example.com/image.jpg"
            },
            { upsert: true, new: true }
        );
        testBookId = (testBook._id as mongoose.Types.ObjectId).toString();
    });

    afterAll(async () => {
        await Book.deleteMany({});
        await Category.deleteMany({});
        await mongoose.connection.close();
    });

    // --- GET /api/books ---
    it("GET /api/books -> Should return a structured paginated object layer", async () => {
        const res = await request(app)
            .get("/api/books")
            .query({ page: 1, limit: 5 });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("status", true);
        expect(res.body).toHaveProperty("data");
        expect(Array.isArray(res.body.data.data)).toBe(true);
        expect(res.body.data.data.length).toBeGreaterThan(0);
    });

    // --- GET /api/books/search ---
    it("GET /api/books/search -> Should return a structured paginated object layer", async () => {
        const res = await request(app)
            .get("/api/books/search")
            .query({ page: 1, limit: 5, title: "Test" });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("status", true);
        expect(res.body.data).toHaveProperty("data");
        expect(res.body.data).toHaveProperty("totalItems");
        expect(res.body.data).toHaveProperty("totalPages");
        expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    // --- GET /api/books/:bookId ---
    it("GET /api/books/:bookId -> Should return a single book object", async () => {
        const res = await request(app)
            .get(`/api/books/${testBookId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe(true);
        expect(res.body.data.book).toHaveProperty("_id", testBookId);
        expect(res.body.data.book).toHaveProperty("title", "Test Book");
    });

    it("GET /api/books/:bookId -> Should return 400 for invalid ID format", async () => {
        const res = await request(app)
            .get("/api/books/invalid-id");

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Validation Error");
        expect(res.body).toHaveProperty("errors");
    });

    it("GET /api/books/:bookId -> Should return 404 for non-existent book", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .get(`/api/books/${nonExistentId}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("status", false);
        expect(res.body).toHaveProperty("message", "Book not found.");
    });
});