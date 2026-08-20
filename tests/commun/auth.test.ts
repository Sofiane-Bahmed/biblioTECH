import request from "supertest";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

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

jest.unstable_mockModule("../../config/cloudinary.js", async () => ({
  cloudinary: { config: jest.fn() },
  storage: {
    _handleFile: (req: any, file: any, cb: any) => {
      file.stream.on("data", () => {});
      file.stream.on("end", () => {
        cb(null, { path: "http://mock-cloudinary.com/image.jpg", size: 1234 });
      });
      file.stream.on("error", (err: Error) => cb(err));
    },
    _removeFile: (req: any, file: any, cb: any) => { cb(null); },
  },
}));

const { default: app } = await import("../../app.js");
const { User } = await import("../../models/user.js");

jest.setTimeout(15000);

describe("🔑 Authentication Operations", () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DBURI!);
    }
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
          confirmPassword: "password123",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe("admin");
      expect(res.body.data.user.email).toBe("admin@test.com");
    });

    it("Should register subsequent users as regular users", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          fullName: "Regular User",
          email: "user@test.com",
          password: "password123",
          confirmPassword: "password123",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe("user");
    });
  });

  describe("POST /api/auth/login", () => {
    it("Should login successfully and set HTTP-Only cookies", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "user@test.com",
          password: "password123",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Welcome back!");
      expect(res.headers["set-cookie"]).toBeDefined();

      const cookies = (res.headers["set-cookie"] || []) as string[];
      const accessCookie = cookies.find((c) => c.startsWith("accessToken="));
      const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));

      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();

      accessToken = accessCookie!.split(";")[0].split("=")[1];
      refreshToken = refreshCookie!.split(";")[0].split("=")[1];
    });

    it("Should fail with incorrect password credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "user@test.com",
          password: "wrongpassword",
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("Invalid email or password credentials.");
    });

    it("Should fail for explicitly blocked accounts", async () => {
      await User.findOneAndUpdate({ email: "user@test.com" }, { isBlocked: true });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "user@test.com",
          password: "password123",
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain("blocked");

      await User.findOneAndUpdate({ email: "user@test.com" }, { isBlocked: false });
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("Should verify, rotate, and reissue cookie structures", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", [`refreshToken=${refreshToken}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Token refreshed and rotated successfully.");
      expect(res.headers["set-cookie"]).toBeDefined();

      const cookies = (res.headers["set-cookie"] || []) as string[];
      refreshToken = cookies
        .find((c) => c.startsWith("refreshToken="))!
        .split(";")[0]
        .split("=")[1];
    });

    it("Should reject completely unauthorized or invalid token formats", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", ["refreshToken=malformed-token-signature"]);

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/auth/forgot-password & reset-password", () => {
    let plainResetToken: string;

    it("Should securely dispatch recovery instructions matching the console log tracking format", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "user@test.com" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe(
        "If an account with that email exists, a password reset link has been dispatched shortly."
      );

      const targetedLogCall = consoleSpy.mock.calls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("Generated reset token for user@test.com:")
      );

      expect(targetedLogCall).toBeDefined();
      const logMessage = targetedLogCall![0] as string;
      plainResetToken = logMessage
        .split("Generated reset token for user@test.com: ")[1]
        .trim();

      consoleSpy.mockRestore();
    });

    it("Should modify the password document parameter given a valid plain reset token signature", async () => {
      const res = await request(app)
        .patch(`/api/auth/reset-password/${plainResetToken}`)
        .send({ password: "newpassword123" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Password reset successful!");

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "user@test.com",
          password: "newpassword123",
        });
      expect(loginRes.statusCode).toBe(200);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("Should drop token indexes and clear client runtime cookies", async () => {
      const email = "logout-user@test.com";
      const password = "password123";

      await User.deleteOne({ email });

      await User.create({
        fullName: "Logout Test User",
        email,
        password,
        role: "user",
      });

      const agent = request.agent(app);

      const loginRes = await agent.post("/api/auth/login").send({
        email,
        password,
      });

      expect(loginRes.statusCode).toBe(200);

      const logoutRes = await agent.post("/api/auth/logout");

      expect(logoutRes.statusCode).toBe(200);
      expect(logoutRes.body.message).toBe("User logged out successfully.");

      const cookies = (logoutRes.headers["set-cookie"] || []) as string[];
      expect(cookies.find((c) => c.startsWith("accessToken=;"))).toBeDefined();
      expect(cookies.find((c) => c.startsWith("refreshToken=;"))).toBeDefined();

      const user = await User.findOne({ email }).select("+refreshToken");
      expect(user!.refreshToken).toBeNull();
    });
  });
});