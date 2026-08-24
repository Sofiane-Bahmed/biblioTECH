import request from "supertest";
import mongoose from "mongoose";
import app from "../../app.js"; // Adjust import to your app entry point
import { Borrow } from "../../models/borrow.js"; // Adjust import to your Borrow model
import { User } from "../../models/user.js";     // Adjust import to your User model
import { Book } from "../../models/book.js";     // Adjust import to your Book model
import { generateTestToken } from "../../utils/test-token.js"; // Helper generating valid JWT token

describe("Librarian Borrow Router Integration Tests", () => {
  let staffToken: string;
  let staffId: mongoose.Types.ObjectId;
  let userId: mongoose.Types.ObjectId;
  let bookId: mongoose.Types.ObjectId;
  let borrowId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // 1. Seed Staff User & Token
    staffId = new mongoose.Types.ObjectId();
    const staffUser = await User.create({
      _id: staffId,
      fullname: "Staff Librarian",
      email: "librarian@library.com",
      role: "librarian", // Ensure role grants authorization
      password: "Password123!",
    });

    // Ensure staffToken is generated with correct payload (including staffId and role)
    staffToken = generateTestToken({ _id: staffUser._id, role: staffUser.role });

    // 2. Seed Standard User & Book
    userId = new mongoose.Types.ObjectId();
    await User.create({
      _id: userId,
      fullname: "John Doe",
      email: "john@example.com",
      role: "librarian",
      outstandingFine: 50.0,
    });

    bookId = new mongoose.Types.ObjectId();
    await Book.create({
      _id: bookId,
      title: "Clean Code",
      availableCopies: 5,
      totalCopies: 5,
    });

    // 3. Seed Base Borrow Record (Ensure valid status enum per schema)
    borrowId = new mongoose.Types.ObjectId();
    await Borrow.create({
      _id: borrowId,
      user: userId,
      book: bookId,
      // Fix: Replace unsupported 'APPROVED' string with valid schema status (e.g., 'PENDING' or 'ISSUED')
      status: "PENDING", 
    });
  });

  describe("GET /api/librarian/borrows", () => {
    it("should retrieve a paginated list of borrow records", async () => {
      const res = await request(app)
        .get("/api/librarian/borrows")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(true);
    });
  });

  describe("POST /api/librarian/borrows/bypass-queue", () => {
    it("should issue a book directly to a user bypassing normal wait time", async () => {
      const res = await request(app)
        .post("/api/librarian/borrows/bypass-queue")
        .set("Authorization", `Bearer ${staffToken}`) // Fixed missing auth header
        .send({
          userId: userId.toString(),
          bookId: bookId.toString(),
          reason: "VIP Request",
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/approve", () => {
    it("should approve a pending borrow request and update book copies", async () => {
      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrowId}/approve`)
        .set("Authorization", `Bearer ${staffToken}`) // Fixed missing auth header
        .send({ approved_message: "Ready for pickup" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/reject", () => {
    it("should reject a borrow request with reason", async () => {
      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrowId}/reject`)
        .set("Authorization", `Bearer ${staffToken}`) // Fixed missing auth header
        .send({ rejected_message: "Item unavailable" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/confirm-handover", () => {
    it("should set status to active when book is handed over", async () => {
      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrowId}/confirm-handover`)
        .set("Authorization", `Bearer ${staffToken}`); // Fixed missing auth header

      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/return-book", () => {
    it("should process book return", async () => {
      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrowId}/return-book`)
        .set("Authorization", `Bearer ${staffToken}`) // Fixed missing auth header
        .send({ condition: "GOOD" });

      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/librarian/borrows/:userId/pay-fine", () => {
    it("should reduce user outstanding fine balance", async () => {
      const res = await request(app)
        .patch(`/api/librarian/borrows/${userId}/pay-fine`)
        .set("Authorization", `Bearer ${staffToken}`) // Fixed missing auth header
        .send({ amountPaid: 20.0, reason: "In-person cash payment" });

      expect(res.status).toBe(200);
      expect(res.body.data.remainingBalance).toBe(30.0);
    });
  });

  describe("GET /api/librarian/borrows/:borrowId", () => {
    it("should fetch details of a single borrow record", async () => {
      const res = await request(app)
        .get(`/api/librarian/borrows/${borrowId}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.borrow._id.toString()).toBe(borrowId.toString());
    });
  });

  describe("DELETE /api/librarian/borrows/:borrowId", () => {
    it("should remove borrow entry", async () => {
      const res = await request(app)
        .delete(`/api/librarian/borrows/${borrowId}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });
  });
});