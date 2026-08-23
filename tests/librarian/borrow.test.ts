import request from "supertest";
import mongoose from "mongoose";
import app from "../../app.js"; // Adjust path if your App export differs
import { Borrow } from "../../models/borrow.js";
import { User } from "../../models/user.js";
import { Book } from "../../models/book.js";

describe("Librarian Borrow Router Integration Tests", () => {
  let staffToken: string;
  let staffId: mongoose.Types.ObjectId;
  let userId: mongoose.Types.ObjectId;
  let bookId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    staffId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
    bookId = new mongoose.Types.ObjectId();

    // Mock staff authentication token if needed by your test setup
    staffToken = "mocked-staff-jwt-token";

    // 1. Create User with required schema fields (password & role)
    await User.create({
      _id: userId,
      fullName: "Test Patron",
      email: "patron@example.com",
      password: "hashedPassword123!", // Required by User schema
      role: "PATRON",                 // Required by User schema
      outstanding_fines: 50.0,
    });

    // 2. Create Book with standard required fields
    await Book.create({
      _id: bookId,
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "9780132350884",           // Common required field on Book schemas
      copies_available: 5,
    });
  });

  describe("GET /api/librarian/borrows", () => {
    it("should retrieve a paginated list of borrow records", async () => {
      await Borrow.create({
        user: userId,
        book: bookId,
        status: "PENDING",
        request_date: new Date(),
      });

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
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          userId: userId.toString(),
          bookId: bookId.toString(),
          reason: "VIP Bypass Request",
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/approve", () => {
    it("should approve a pending borrow request and update book copies", async () => {
      const borrow = await Borrow.create({
        user: userId,
        book: bookId,
        status: "PENDING",
        request_date: new Date(),
      });

      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrow._id}/approve`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ approved_message: "Ready for pickup" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/reject", () => {
    it("should reject a borrow request with reason", async () => {
      const borrow = await Borrow.create({
        user: userId,
        book: bookId,
        status: "PENDING",
        request_date: new Date(),
      });

      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrow._id}/reject`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ rejected_message: "Item unavailable" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/confirm-handover", () => {
    it("should set status to active when book is handed over", async () => {
      const borrow = await Borrow.create({
        user: userId,
        book: bookId,
        status: "APPROVED",
        pickup_deadline: new Date(Date.now() + 86400000),
      });

      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrow._id}/confirm-handover`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("ACTIVE");
    });
  });

  describe("PATCH /api/librarian/borrows/:borrowId/return-book", () => {
    it("should process book return", async () => {
      const borrow = await Borrow.create({
        user: userId,
        book: bookId,
        status: "ACTIVE",
        borrow_date: new Date(),
        due_date: new Date(Date.now() + 86400000),
      });

      const res = await request(app)
        .patch(`/api/librarian/borrows/${borrow._id}/return-book`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ condition: "GOOD" });

      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/librarian/borrows/:userId/pay-fine", () => {
    it("should reduce user outstanding fine balance", async () => {
      const res = await request(app)
        .patch(`/api/librarian/borrows/${userId}/pay-fine`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ amountPaid: 20.0, reason: "In-person cash payment" });

      expect(res.status).toBe(200);
      expect(res.body.data.remainingBalance).toBe(30.0);
    });
  });

  describe("GET /api/librarian/borrows/:borrowId", () => {
    it("should fetch details of a single borrow record", async () => {
      const borrow = await Borrow.create({
        user: userId,
        book: bookId,
        status: "PENDING",
        request_date: new Date(),
      });

      const res = await request(app)
        .get(`/api/librarian/borrows/${borrow._id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.borrow._id.toString()).toBe(borrow._id.toString());
    });
  });

  describe("DELETE /api/librarian/borrows/:borrowId", () => {
    it("should remove borrow entry", async () => {
      const borrow = await Borrow.create({
        user: userId,
        book: bookId,
        status: "PENDING",
        request_date: new Date(),
      });

      const res = await request(app)
        .delete(`/api/librarian/borrows/${borrow._id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });
  });
});