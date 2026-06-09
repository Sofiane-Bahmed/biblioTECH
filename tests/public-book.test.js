import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js"; 
import { Book } from "../models/book.js";
import { Category } from "../models/category.js";

// Setup global hooks before running tests
beforeAll(async () => {
    // Ensure your test environment connects to your development or isolated test database cluster
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.DBURI);
    }
});

// Close database connections cleanly when finished to prevent open handles
afterAll(async () => {
    await mongoose.connection.close();
});

describe("📚 Backend Readiness & Quality Assurance - Book Router", () => {
    let testBookId;
    let testCategory;

    beforeAll(async () => {
        // Seed a category and a book for testing individual book retrieval
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
        testBookId = testBook._id.toString();
    });

    it("GET /api/books -> Should return a structured paginated object layer", async () => {
        const res = await request(app)
            .get("/api/books")
            .query({ page: 1, limit: 5 });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("data");
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("GET /api/books/search -> Should return a structured paginated object layer", async () => {
        const res = await request(app)
            .get("/api/books/search")
            .query({ page: 1, limit: 5, title: "Test" }); 

        // 1. Assert Response Status
        expect(res.statusCode).toBe(200);

        // 2. Assert Reusable Pagination Utility Structure Integrity
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("data");
        expect(res.body).toHaveProperty("totalItems");
        expect(res.body).toHaveProperty("totalPages");
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("GET /api/books/:id -> Should return a single book object", async () => {
        const res = await request(app)
            .get(`/api/books/${testBookId}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("_id", testBookId);
        expect(res.body).toHaveProperty("title", "Test Book");
    });

    it("GET /api/books/:id -> Should return 400 for invalid ID format", async () => {
        const res = await request(app)
            .get("/api/books/invalid-id");

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("message", "Validation Error");
        expect(res.body).toHaveProperty("errors");
    });

    it("GET /api/books/:id -> Should return 404 for non-existent book", async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const res = await request(app)
            .get(`/api/books/${nonExistentId}`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("message", "Book not found");
    });

});