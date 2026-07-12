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
            send: jest.fn().mockImplementation(() => Promise.resolve({ data: { id: "test-id" }, error: null })),
        },
    })),
}));

jest.unstable_mockModule("../config/cloudinary.js", async () => {
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
const { default: app } = await import("../app.js");
const { User } = await import("../models/user.js");
const { Borrow } = await import("../models/borrow.js");
const { Book } = await import("../models/book.js");

jest.setTimeout(15000);

describe("👤 User Profile Operations", () => {
    let userToken: string;
    let testUser: any;
    let testBook: any;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // Cleanup isolated records
        await User.deleteMany({ email: { $in: ["profile-test@test.com", "updated-profile@test.com"] } });
        await Book.deleteMany({ title: "Profile Reference Book" });
        await Borrow.deleteMany({});

        testUser = await User.create({
            fullName: "Profile Test User",
            email: "profile-test@test.com",
            password: "password123",
            role: "user"
        });

        userToken = Jwt.sign(
            { _id: testUser._id, role: "user" },
            process.env.JWT_ACCESS_SECRET!,
            { expiresIn: "1h" }
        );

        testBook = await Book.create({
            title: "Profile Reference Book",
            isbn: "5555555555555",
            author: ["Author Name"],
            category: [new mongoose.Types.ObjectId()],
            description: "Sample Description",
            copies_available: 5,
            pages: 120,
            language: "English",
            publication_year: 2024,
            cover_image: "http://mock-cloudinary.com/image.jpg"
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // --- GET /api/user/profile/me ---
    describe("GET /api/user/profile/me", () => {
        it("Should return the authenticated user's profile details", async () => {
            const res = await request(app)
                .get("/api/user/profile/me")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe("profile-test@test.com");
            expect(res.body.fullName).toBe("Profile Test User");
            expect(res.body).not.toHaveProperty("password");
        });

        it("Should reject unauthenticated pipeline requests", async () => {
            const res = await request(app).get("/api/user/profile/me");
            expect(res.statusCode).toBe(401);
        });
    });

    // --- PUT /api/user/profile/me ---
    describe("PUT /api/user/profile/me", () => {
        it("Should update profile schema records matching body modifications", async () => {
            const res = await request(app)
                .put("/api/user/profile/me")
                .set("Cookie", [`accessToken=${userToken}`])
                .send({
                    fullName: "Updated Name",
                    email: "updated-profile@test.com"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Profile updated successfully");
            expect(res.body.user.fullName).toBe("Updated Name");
            expect(res.body.user.email).toBe("updated-profile@test.com");
        });

        it("Should fail schema validation layers if payload strings run short", async () => {
            const res = await request(app)
                .put("/api/user/profile/me")
                .set("Cookie", [`accessToken=${userToken}`])
                .send({ fullName: "Ab" });

            expect(res.statusCode).toBe(400);
        });
    });

    // --- GET /api/user/profile/borrows ---
    describe("GET /api/user/profile/borrows", () => {
        beforeAll(async () => {
            // Seed a historical log mix to test filter logic structures
            await Borrow.create([
                {
                    user: testUser._id,
                    book: testBook._id,
                    status: "ACTIVE",
                    borrow_date: new Date(),
                    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // Valid active
                },
                {
                    user: testUser._id,
                    book: testBook._id,
                    status: "ACTIVE",
                    borrow_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Overdue record
                }
            ]);
        });

        it("Should retrieve paginated logs with integrated book populations", async () => {
            const res = await request(app)
                .get("/api/user/profile/borrows")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("User borrow records retrieved successfully.");
            expect(res.body.result.data.length).toBe(2);
            expect(res.body.result.data[0].book.title).toBe("Profile Reference Book");
        });

        it("Should isolate overdue states correctly when using explicit query parameters", async () => {
            const res = await request(app)
                .get("/api/user/profile/borrows")
                .query({ overdue: "true" })
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.result.data.length).toBe(1);
            expect(res.body.result.data[0].status).toBe("ACTIVE");
        });
    });
});