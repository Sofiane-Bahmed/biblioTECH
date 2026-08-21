import request from "supertest";
import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

// 1. Setup ESM Mocks before importing modules
jest.unstable_mockModule("axios", () => ({
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
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
                        size: 1234,
                    });
                });
                file.stream.on("error", (err: Error) => cb(err));
            },
            _removeFile: (req: any, file: any, cb: any) => {
                cb(null);
            },
        },
    };
});

// 2. Dynamic import after setting up ESM mocks
const { default: app } = await import("../../app.js");
const { Book } = await import("../../models/book.js");
const { Category } = await import("../../models/category.js");
const { User } = await import("../../models/user.js");
const { default: axios } = await import("axios");

const mockedAxios = jest.mocked(axios);

jest.setTimeout(10000);

describe("📚 Librarian Operations - Book Management", () => {
    let librarianToken: string;
    let librarianUser: any;
    let regularUser: any;
    let testCategory: any;
    let testBookId: string;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // 1. Delete all test users and target books before inserting
        await User.deleteMany({
            email: { $in: ["librarian@test.com", "regular-reader@test.com"] }
        });
        await Book.deleteMany({
            isbn: { $in: ["0486284737", "0486284738", "0486284739"] }
        });

        // 2. Create fresh test users
        librarianUser = await User.create({
            fullName: "Librarian User",
            email: "librarian@test.com",
            password: "password123",
            role: "librarian",
            subscribed: true,
        });

        regularUser = await User.create({
            fullName: "Regular Reader",
            email: "regular-reader@test.com",
            password: "password123",
            role: "user",
        });

        librarianToken = Jwt.sign(
            { _id: librarianUser._id, role: "librarian" },
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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /api/librarian/books/auto-import", () => {
        it("Should auto-import book details from Google Books API", async () => {
            const mockGoogleResponse = {
                data: {
                    items: [
                        {
                            volumeInfo: {
                                title: "Auto Imported Book",
                                authors: ["Google Author"],
                                description: "Imported description",
                                pageCount: 150,
                                language: "en",
                                publishedDate: "2020-05-20",
                                imageLinks: { thumbnail: "http://google.com/image.jpg" },
                                categories: ["Science Fiction"],
                            },
                        },
                    ],
                },
            };

            // Direct mock assignment that bypasses TypeScript generic constraints
            mockedAxios.post.mockImplementation(async (url: any) => {
                if (typeof url === "string" && url.includes("0486284739")) {
                    return mockGoogleResponse as any;
                }
                return { data: { items: [] } } as any;
            });

            const res = await request(app)
                .post("/api/librarian/books/auto-import")
                .set("Cookie", [`accessToken=${librarianToken}`])
                .send({ isbn: "0486284739" });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Book auto-discovered and registered successfully!");
            expect(res.body.data).toHaveProperty("title", "Auto Imported Book");
        });
    });
});