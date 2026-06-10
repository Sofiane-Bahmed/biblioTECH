import request from "supertest";
import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import { jest } from "@jest/globals";
import crypto from "crypto";

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

describe("🔐 Authentication Operations", () => {
    let accessToken;
    let refreshToken;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("POST /api/auth/register", () => {
        it("Should register the first user as an admin", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    fullName: "First Admin",
                    email: "admin@test.com",
                    password: "password123",
                    confirmPassword: "password123"
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.role).toBe("admin");
            expect(res.body.email).toBe("admin@test.com");
        });

        it("Should register subsequent users as regular users", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    fullName: "Regular User",
                    email: "user@test.com",
                    password: "password123",
                    confirmPassword: "password123"
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.role).toBe("user");
        });

        it("Should fail if passwords do not match", async () => {
            const res = await request(app)
                .post("/api/auth/register")
                .send({
                    fullName: "Fail User",
                    email: "fail@test.com",
                    password: "password123",
                    confirmPassword: "differentpassword"
                });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("POST /api/auth/login", () => {
        it("Should login successfully and set cookies", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "user@test.com",
                    password: "password123"
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Welcome back!");
            expect(res.headers["set-cookie"]).toBeDefined();
            
            // Extract tokens from cookies for later tests
            const cookies = res.headers["set-cookie"];
            accessToken = cookies.find(c => c.startsWith("accessToken=")).split(";")[0].split("=")[1];
            refreshToken = cookies.find(c => c.startsWith("refreshToken=")).split(";")[0].split("=")[1];
        });

        it("Should fail with incorrect password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "user@test.com",
                    password: "wrongpassword"
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe("Invalid credentials");
        });

        it("Should fail for blocked users", async () => {
            await User.findOneAndUpdate({ email: "user@test.com" }, { isBlocked: true });

            const res = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "user@test.com",
                    password: "password123"
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toContain("blocked");

            // Unblock for next tests
            await User.findOneAndUpdate({ email: "user@test.com" }, { isBlocked: false });
        });
    });

    describe("POST /api/auth/refresh", () => {
        it("Should refresh and rotate tokens", async () => {
            const res = await request(app)
                .post("/api/auth/refresh")
                .set("Cookie", [`refreshToken=${refreshToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Token refreshed and rotated successfully");
            expect(res.headers["set-cookie"]).toBeDefined();

            // Update refreshToken for subsequent tests (rotation)
            const cookies = res.headers["set-cookie"];
            refreshToken = cookies.find(c => c.startsWith("refreshToken=")).split(";")[0].split("=")[1];
        });

        it("Should fail with invalid refresh token", async () => {
            const res = await request(app)
                .post("/api/auth/refresh")
                .set("Cookie", ["refreshToken=invalidtoken"]);

            expect(res.statusCode).toBe(401); // verify fails
        });
    });

    describe("POST /api/auth/forgot-password & reset-password", () => {
        let resetToken;

        it("Should generate reset token and send email", async () => {
            // We need to capture the token sent in the email. 
            // Since we mocked sendPasswordResetEmail indirectly via Resend, 
            // we can check the DB or just spy on the function.
            // Let's check the DB for the hashed token and try to guess the plain one? 
            // Or better, read the logs if we can. 
            // Actually, the controller logs it: console.log("TESTING RESET TOKEN (PLAIN):", resetToken);
            
            const spy = jest.spyOn(console, 'log');

            const res = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: "user@test.com" });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Password reset link sent to your email");

            // Extract token from console.log
            const logCall = spy.mock.calls.find(call => call[0] === "TESTING RESET TOKEN (PLAIN):");
            resetToken = logCall[1];
            spy.mockRestore();
        });

        it("Should reset password using valid token", async () => {
            const res = await request(app)
                .patch(`/api/auth/reset-password/${resetToken}`)
                .send({ password: "newpassword123" });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Password reset successful!");

            // Verify login with new password
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "user@test.com",
                    password: "newpassword123"
                });
            expect(loginRes.statusCode).toBe(200);

            // Update tokens for logout test
            const cookies = loginRes.headers["set-cookie"];
            accessToken = cookies.find(c => c.startsWith("accessToken=")).split(";")[0].split("=")[1];
            refreshToken = cookies.find(c => c.startsWith("refreshToken=")).split(";")[0].split("=")[1];
        });

        it("Should fail with expired or invalid token", async () => {
            const res = await request(app)
                .patch("/api/auth/reset-password/invalidtoken")
                .send({ password: "password123" });

            expect(res.statusCode).toBe(400);
        });
    });

    describe("GET /api/auth/logout", () => {
        it("Should logout successfully and clear cookies", async () => {
            // Use the most recent refreshToken (it might have been rotated in the refresh test)
            const res = await request(app)
                .get("/api/auth/logout")
                .set("Cookie", [`refreshToken=${refreshToken}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("User logged out successfully");
            
            const cookies = res.headers["set-cookie"];
            expect(cookies.find(c => c.startsWith("accessToken=;"))).toBeDefined();
            expect(cookies.find(c => c.startsWith("refreshToken=;"))).toBeDefined();

            // Verify token removed from DB
            const user = await User.findOne({ email: "user@test.com" }).select("+refreshToken");
            expect(user.refreshToken).toBeFalsy();
        });
    });
});
