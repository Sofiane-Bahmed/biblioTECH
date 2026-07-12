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
jest.unstable_mockModule("../config/cloudinary.js", async () => {
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
const { default: app } = await import("../app.js");
const { User } = await import("../models/user.js");

jest.setTimeout(15000);

describe("🛡️ Admin User Management Operations", () => {
    let adminToken: string;
    let adminUser: any;
    let targetUser: any;
    let alternateAdminUser: any;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // Complete database cleanup
        await User.deleteMany({});

        // Setup Main Admin
        adminUser = await User.create({
            fullName: "Primary Admin",
            email: "admin-main@test.com",
            password: "password123",
            role: "admin",
            isBlocked: false
        });

        adminToken = Jwt.sign(
            { _id: adminUser._id, role: "admin" },
            process.env.JWT_ACCESS_SECRET!,
            { expiresIn: "1h" }
        );

        // Setup Secondary Admin (to test edge cases like attempting to block an admin)
        alternateAdminUser = await User.create({
            fullName: "Secondary Admin",
            email: "admin-sec@test.com",
            password: "password123",
            role: "admin",
            isBlocked: false
        });

        // Setup Target Regular User
        targetUser = await User.create({
            fullName: "Standard Consumer",
            email: "consumer@test.com",
            password: "password123",
            role: "user",
            isBlocked: false
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    // --- GET /api/admin/users (Pagination & Fetching) ---
    describe("GET /api/admin/users", () => {
        it("Should return a paginated viewport slice of users", async () => {
            const res = await request(app)
                .get("/api/admin/users?page=1&limit=2")
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(2);
            expect(res.body.totalUsers).toBeGreaterThanOrEqual(3);
            expect(res.body.totalPages).toBeDefined();
        });
    });

    // --- GET /api/admin/users/:userId (Single Fetch) ---
    describe("GET /api/admin/users/:userId", () => {
        it("Should successfully fetch profile payload data structures for a valid id", async () => {
            const res = await request(app)
                .get(`/api/admin/users/${targetUser._id}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe("consumer@test.com");
        });

        it("Should return 404 if the user is missing", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/admin/users/${fakeId}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(404);
        });
    });

    // --- PATCH /api/admin/users/:id/role (Role Modifying) ---
    describe("PATCH /api/admin/users/:id/role", () => {
        it("Should allow changing another user's authorization tier", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${targetUser._id}/role`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ role: "admin" });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.role).toBe("admin");

            // Revert back to original role state for subsequent blocks tests
            await User.findByIdAndUpdate(targetUser._id, { $set: { role: "user" } });
        });

        it("Should block admins from self-demoting or altering their own role", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${adminUser._id}/role`)
                .set("Cookie", [`accessToken=${adminToken}`])
                .send({ role: "user" });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("You cannot change your own administrative role");
        });
    });

    // --- PATCH /api/admin/users/:userId/block (Blocking Constraints) ---
    describe("PATCH /api/admin/users/:userId/block", () => {
        it("Should lock out standard users successfully", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${targetUser._id}/block`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("User blocked successfully");
            expect(res.body.blockedUser.isBlocked).toBe(true);
        });

        it("Should prevent blocking administrative users entirely", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${alternateAdminUser._id}/block`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe("You cannot block an admin user");
        });
    });

    // --- PATCH /api/admin/users/:userId/unblock (Unblocking) ---
    describe("PATCH /api/admin/users/:userId/unblock", () => {
        it("Should clear the block flag from the database record", async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${targetUser._id}/unblock`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("User unblocked successfully");
            expect(res.body.user.isBlocked).toBe(false);
        });
    });

    // --- DELETE /api/admin/users/:userId (Removal) ---
    describe("DELETE /api/admin/users/:userId", () => {
        it("Should cleanly prune the targeted account row record", async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${targetUser._id}`)
                .set("Cookie", [`accessToken=${adminToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("user deleted successfully");

            const check = await User.findById(targetUser._id);
            expect(check).toBeNull();
        });
    });
});