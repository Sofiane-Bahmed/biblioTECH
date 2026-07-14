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
            send: jest.fn().mockImplementation(() => Promise.resolve({ data: { id: "test-id" }, error: null }))
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
            _handleFile: (req, file, cb) => {
                file.stream.on("data", () => { });
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
const { default: app } = await import("../../app.js");
const { User } = await import("../../models/user.js");

jest.setTimeout(10000);

describe("🛡️ Admin User Operations", () => {
    let adminToken;
    let adminUser;
    let testUser;
    let testUserId;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({ email: { $in: ["admin-user@test.com", "test-user@test.com"] } });

        // Setup Admin
        adminUser = await User.create({
            fullName: "Admin User",
            email: "admin-user@test.com",
            password: "password123",
            role: "admin"
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );

        // Setup Test User
        testUser = await User.create({
            fullName: "Test User",
            email: "test-user@test.com",
            password: "password123",
            role: "user"
        });
        testUserId = testUser._id;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("GET /api/admin/users/get-all", () => {
        it("Should return all users with pagination", async () => {
            const res = await request(app)
                .get("/api/admin/users/get-all")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.totalUsers).toBeGreaterThanOrEqual(2);
        });
    });

    describe("GET /api/admin/users/:userId", () => {
        it("Should return a specific user by ID", async () => {
            const res = await request(app)
                .get(`/api/admin/users/${testUserId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe("test-user@test.com");
        });

        it("Should return 404 for non-existent user", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/users/${fakeId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(404);
        });
    });

    describe("PUT /api/admin/users/:id/role", () => {
        it("Should update user role to admin", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}/role`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ role: "admin" });

            expect(res.statusCode).toBe(200);
            expect(res.body.user.role).toBe("admin");

            // Reset for other tests
            await User.findByIdAndUpdate(testUserId, { role: "user" });
        });

        it("Should prevent admin from changing their own role", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${adminUser._id}/role`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ role: "user" });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You cannot change your own administrative role");
        });
    });

    describe("PUT /api/admin/users/:userId/block", () => {
        it("Should block a user", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}/block`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.user.isBlocked).toBe(true);
        });
    });

    describe("PUT /api/admin/users/:userId/unblock", () => {
        it("Should unblock a user", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}/unblock`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.user.isBlocked).toBe(false);
        });
    });

    describe("DELETE /api/admin/users/:userId", () => {
        it("Should delete a user", async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${testUserId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("user deleted successfully");

            const check = await User.findById(testUserId);
            expect(check).toBeNull();
        });
    });

    describe("Security - Admin Only", () => {
        it("Should reject non-admin users", async () => {
            const userToken = Jwt.sign(
                { _id: new mongoose.Types.ObjectId(), role: "user" },
                process.env.JWT_ACCESS_SECRET
            );

            const res = await request(app)
                .get("/api/admin/users/get-all")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(403);
        });

        it("Should reject unauthenticated requests", async () => {
            const res = await request(app)
                .get("/api/admin/users/get-all");

            expect(res.statusCode).toBe(401);
        });
    });
});
