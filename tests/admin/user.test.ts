import request from "supertest";
import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import { jest } from "@jest/globals";

// Mock external services
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
                file.stream.on("error", (err: any) => cb(err));
            },
            _removeFile: (req: any, file: any, cb: any) => {
                cb(null);
            }
        },
    };
});

const { default: app } = await import("../../app.js");
const { User } = await import("../../models/user.js");

jest.setTimeout(10000);

describe("🛡️ Admin User Operations", () => {
    let adminToken: string;
    let adminUser: any;
    let testUser: any;
    let testUserId: string;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI as string);
        }

        await User.deleteMany({ email: { $in: ["admin-user@test.com", "test-user@test.com"] } });

        adminUser = await User.create({
            fullName: "Admin User",
            email: "admin-user@test.com",
            password: "password123",
            role: "admin"
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET as string,
            { expiresIn: "1h" }
        );

        testUser = await User.create({
            fullName: "Test User",
            email: "test-user@test.com",
            password: "password123",
            role: "user"
        });
        testUserId = testUser._id.toString();
    });

    afterAll(async () => {
        await User.deleteMany({ email: { $in: ["admin-user@test.com", "test-user@test.com"] } });
        await mongoose.connection.close();
    });

    describe("GET /api/admin/users/get-all", () => {
        it("Should return all users with pagination", async () => {
            const res = await request(app)
                .get("/api/admin/users/get-all")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.users).toBeDefined();
            expect(res.body.data.pagination.totalUsers).toBeGreaterThanOrEqual(2);
        });
    });

    describe("GET /api/admin/users/:userId", () => {
        it("Should return a specific user by ID", async () => {
            const res = await request(app)
                .get(`/api/admin/users/${testUserId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.user.email).toBe("test-user@test.com");
        });

        it("Should return 404 for non-existent user", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/users/${fakeId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(404);
            expect(res.body.status).toBe(false);
        });
    });

    describe("PUT /api/admin/users/:id/role", () => {
        it("Should update user role to admin", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}/role`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ role: "admin" });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.role).toBe("admin");

            // Reset role for remaining tests
            await User.findByIdAndUpdate(testUserId, { role: "user" });
        });

        it("Should prevent admin from changing their own role", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${adminUser._id}/role`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ role: "user" });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You cannot change your own administrative role.");
        });
    });

    describe("PUT /api/admin/users/:userId/block", () => {
        it("Should block a user", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}/block`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.isBlocked).toBe(true);
        });
    });

    describe("PUT /api/admin/users/:userId/unblock", () => {
        it("Should unblock a user", async () => {
            const res = await request(app)
                .put(`/api/admin/users/${testUserId}/unblock`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data.isBlocked).toBe(false);
        });
    });

    describe("DELETE /api/admin/users/:userId", () => {
        it("Should delete a user", async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${testUserId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("User deleted successfully.");

            const check = await User.findById(testUserId);
            expect(check).toBeNull();
        });
    });

    describe("Security - Admin Only", () => {
        it("Should reject non-admin users", async () => {
            const securityCheckUser = await User.create({
                fullName: "Security Test User",
                email: "security-test@test.com",
                password: "password123",
                role: "user"
            });

            const userToken = Jwt.sign(
                { _id: securityCheckUser._id, role: "user" },
                process.env.JWT_ACCESS_SECRET as string
            );

            const res = await request(app)
                .get("/api/admin/users/get-all")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(403);

            await User.deleteOne({ _id: securityCheckUser._id });
        });

        it("Should reject unauthenticated requests", async () => {
            const res = await request(app)
                .get("/api/admin/users/get-all");

            expect(res.statusCode).toBe(401);
        });
    });
});