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
const { User } = await import("../models/user.js");

jest.setTimeout(15000);

describe("👤 User Profile Operations", () => {
    let userToken;
    let testUser;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({ email: { $in: ["profile-test@test.com", "updated-profile@test.com"] } });

        // 1. Setup User
        testUser = await User.create({
            fullName: "Profile Test User",
            email: "profile-test@test.com",
            password: "password123",
            role: "user"
        });

        userToken = Jwt.sign(
            { _id: testUser._id, role: "user" },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "1h" }
        );
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("GET /api/user/profile/me", () => {
        it("Should return the authenticated user's profile", async () => {
            const res = await request(app)
                .get("/api/user/profile/me")
                .set("Cookie", [`accessToken=${userToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe("profile-test@test.com");
            expect(res.body.fullName).toBe("Profile Test User");
            expect(res.body).not.toHaveProperty("password");
        });

        it("Should reject unauthenticated requests", async () => {
            const res = await request(app)
                .get("/api/user/profile/me");

            expect(res.statusCode).toBe(401);
        });
    });

    describe("PUT /api/user/profile/me", () => {
        it("Should update the user's profile information", async () => {
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

        it("Should fail validation if fullName is too short", async () => {
            const res = await request(app)
                .put("/api/user/profile/me")
                .set("Cookie", [`accessToken=${userToken}`])
                .send({ fullName: "Ab" });

            expect(res.statusCode).toBe(400);
        });

        it("Should fail validation if email format is invalid", async () => {
            const res = await request(app)
                .put("/api/user/profile/me")
                .set("Cookie", [`accessToken=${userToken}`])
                .send({ email: "invalid-email" });

            expect(res.statusCode).toBe(400);
        });
    });
});
