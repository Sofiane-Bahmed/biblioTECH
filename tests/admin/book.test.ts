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

// Dynamic imports after mocks
const { default: app } = await import("../../app.js");
const { Book } = await import("../../models/book.js");
const { Category } = await import("../../models/category.js");
const { User } = await import("../../models/user.js");
const { default: axios } = await import("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.setTimeout(10000);

describe("🛡️ Backend Security & Admin Operations - Book Management", () => {
    let adminToken: string;
    let adminUser: any;
    let regularUser: any;
    let testCategory: any;
    let testBookId: string;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        await User.deleteMany({ email: "admin@test.com" });
        await Book.deleteMany({ title: /Admin Book|Auto Imported Book/ });

        adminUser = await User.create({
            fullName: "Admin User",
            email: "admin@test.com",
            password: "password123",
            role: "admin",
            subscribed: true
        });

        // Setup Regular User (Non-Admin)
        regularUser = await User.create({
            fullName: "Regular Reader",
            email: "regular-reader@test.com",
            password: "password123",
            role: "user"
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET!,
            { expiresIn: "1h" }
        );

        testCategory = await Category.findOneAndUpdate(
            { title: "Science Fiction" },
            { title: "Science Fiction", description: "Sci-Fi Books" },
            { upsert: true, new: true }
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("POST /api/admin/books", () => {
        it("Should allow admin to add a book with cover image", async () => {
            const res = await request(app)
                .post("/api/admin/books")
                .set("Cookie", [`accessToken=${adminToken}`])
                .field("title", "New Admin Book")
                .field("isbn", "0486284737")
                .field("author", "Admin Author")
                // Pass category as an array element if your middleware/validation requires it
                .field("category[]", "Science Fiction")
                .field("description", "A book added by admin for testing.")
                .field("copies_available", 10)
                .field("pages", 350)
                .field("language", "English")
                .field("publication_year", 2023)
                .attach("coverImage", Buffer.from("fake-image-content"), "cover.jpg");

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("title", "New Admin Book");
            testBookId = res.body._id;
        });

        it("Should fail if category does not exist", async () => {
            const res = await request(app)
                .post("/api/admin/books")
                .set("Cookie", [`accessToken=${adminToken}`])
                .field("title", "Invalid Category Book")
                .field("isbn", "0486284738")
                .field("author", "Author")
                .field("category[]", "Non-Existent Category")
                .field("description", "Description...")
                .field("copies_available", 1)
                .field("pages", 100)
                .field("language", "English")
                .field("publication_year", 2023)
                .attach("coverImage", Buffer.from("fake-image"), "cover.jpg");

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("Validation failed: Some specified categories do not exist.");
        });

        it("Should reject non-admin users", async () => {
            // 1. Generate a token for a regular non-admin user
            const nonAdminToken = Jwt.sign(
                { _id: regularUser._id, role: "user" }, 
                process.env.JWT_ACCESS_SECRET!,
                { expiresIn: "1h" }
            );

            // 2. Make the request with the non-admin cookie
            const res = await request(app)
                .post("/api/admin/books")
                .set("Cookie", [`accessToken=${nonAdminToken}`]) // 👈 This must be present!
                .send({
                    title: "Hack Attempt",
                    isbn: "9781234567897",
                    author: ["Some Author"],
                    category: [testCategory._id],
                    description: "Some description",
                    copies_available: 3,
                    pages: 250,
                    language: "English",
                    publication_year: 2024
                });

            // Now, because authentication succeeds, authorization will fail with a 403!
            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Access forbidden: Insufficient permissions");
        });
    });

    describe("GET /api/admin/books/auto-import", () => {
        it("Should auto-import book details from Google Books API", async () => {
            const mockGoogleResponse = {
                data: {
                    items: [{
                        volumeInfo: {
                            title: "Auto Imported Book",
                            authors: ["Google Author"],
                            description: "Imported description",
                            pageCount: 150,
                            language: "en",
                            publishedDate: "2020-05-20",
                            imageLinks: { thumbnail: "http://google.com/image.jpg" },
                            categories: ["Science Fiction"]
                        }
                    }]
                }
            };

            mockedAxios.get.mockResolvedValue(mockGoogleResponse);

            const res = await request(app)
                .get("/api/admin/books/auto-import")
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ isbn: "0486284739" });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Book auto-discovered and registered successfully!");
            expect(res.body.book).toHaveProperty("title", "Auto Imported Book");
        });
    });

    describe("PUT /api/admin/books/:bookId", () => {
        it("Should allow admin to update book details", async () => {
            const res = await request(app)
                .put(`/api/admin/books/${testBookId}`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .field("title", "Updated Admin Book Title")
                .attach("coverImage", Buffer.from("updated-image"), "updated.jpg");

            expect(res.statusCode).toBe(200);
            expect(res.body.updatedBook).toHaveProperty("title", "Updated Admin Book Title");
        });
    });

    describe("DELETE /api/admin/books/:bookId", () => {
        it("Should allow admin to delete a book", async () => {
            const res = await request(app)
                .delete(`/api/admin/books/${testBookId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("book deleted successfully");

            const checkBook = await Book.findById(testBookId);
            expect(checkBook).toBeNull();
        });
    });
});