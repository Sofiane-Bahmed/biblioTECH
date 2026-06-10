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
const { Category } = await import("../models/category.js");
const { User } = await import("../models/user.js");

jest.setTimeout(10000);

describe("🛡️ Admin Category Operations", () => {
    let adminToken;
    let adminUser;
    let testCategoryId;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({ email: "admin-category@test.com" });
        await Category.deleteMany({ title: /Test Category/ });

        // Setup Admin
        adminUser = await User.create({
            fullName: "Admin Category",
            email: "admin-category@test.com",
            password: "password123",
            role: "admin"
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("POST /api/admin/categories", () => {
        it("Should allow admin to create a new category", async () => {
            const res = await request(app)
                .post("/api/admin/categories")
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({
                    title: "Test Category 1",
                    description: "Initial description for testing purposes."
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.title).toBe("Test Category 1");
            testCategoryId = res.body._id;
        });

        it("Should fail validation if title is too short", async () => {
            const res = await request(app)
                .post("/api/admin/categories")
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({
                    title: "A",
                    description: "Description is long enough."
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /api/admin/categories", () => {
        it("Should return all categories", async () => {
            const res = await request(app)
                .get("/api/admin/categories")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("GET /api/admin/categories/:id", () => {
        it("Should return a specific category", async () => {
            const res = await request(app)
                .get(`/api/admin/categories/${testCategoryId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.title).toBe("Test Category 1");
        });

        it("Should return 400 for invalid ID format", async () => {
            const res = await request(app)
                .get("/api/admin/categories/invalid-id")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(400);
        });
    });

    describe("PATCH /api/admin/categories/:id", () => {
        it("Should allow admin to update category details", async () => {
            const res = await request(app)
                .patch(`/api/admin/categories/${testCategoryId}`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({
                    title: "Updated Test Category",
                    description: "Updated description for testing purposes."
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.category.title).toBe("Updated Test Category");
        });
    });

    describe("DELETE /api/admin/categories/:id", () => {
        it("Should allow admin to delete a category", async () => {
            const res = await request(app)
                .delete(`/api/admin/categories/${testCategoryId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Category successfully deleted");

            const check = await Category.findById(testCategoryId);
            expect(check).toBeNull();
        });

        it("Should return 404 for non-existent category", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .delete(`/api/admin/categories/${fakeId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("Security - Admin Only", () => {
        it("Should reject non-admin users", async () => {
            const userToken = Jwt.sign(
                { _id: new mongoose.Types.ObjectId(), role: "user" },
                process.env.JWT_ACCESS_SECRET
            );

            const res = await request(app)
                .post("/api/admin/categories")
                .set("Cookie", [`accessToken=${userToken}`])
                .send({ title: "Hack Category", description: "Hack description..." });

            expect(res.statusCode).toBe(403);
        });

        it("Should reject unauthenticated requests", async () => {
            const res = await request(app)
                .get("/api/admin/categories");

            expect(res.statusCode).toBe(401);
        });
    });
});
