import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest } from "@jest/globals";

import { Comment } from "../../models/comment.js";
import { User } from "../../models/user.js";
import { Book } from "../../models/book.js";
import { adminCommentRouter } from "../../routers/admin/comment.js";

// Mock validate middleware to pass requests through during tests
jest.mock("../../middlewares/validate.js", () => ({
  validate: () => (req: any, _res: any, next: any) => next(),
}));

let mongoServer: MongoMemoryServer;
let app: express.Application;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());

  // Attach router under test
  app.use("/api/admin/comments", adminCommentRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Comment.deleteMany({});
  await User.deleteMany({});
  await Book.deleteMany({});
});

describe("GET /api/admin/comments (getComments)", () => {
  it("should return 200 with empty data array when no comments exist", async () => {
    const res = await request(app).get("/api/admin/comments");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("No comments found.");
    expect(res.body.data.data).toEqual([]);
  });

  it("should retrieve comments populated with user, book, and nested reply users", async () => {
    const user1 = await User.create({ fullName: "Jane Doe", email: "jane@test.com" });
    const user2 = await User.create({ fullName: "John Smith", email: "john@test.com" });
    const book = await Book.create({ title: "Clean Code", author: "Robert Martin" });

    // Create a reply comment first
    const reply = await Comment.create({
      user: user2._id,
      book: book._id,
      content: "I agree with this point.",
    });

    // Create main comment referencing the reply
    await Comment.create({
      user: user1._id,
      book: book._id,
      content: "Great read!",
      replies: [reply._id],
    });

    const res = await request(app).get("/api/admin/comments");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe("Comments retrieved successfully.");
    expect(res.body.data.data.length).toBeGreaterThan(0);

    const mainComment = res.body.data.data.find((c: any) => c.content === "Great read!");
    expect(mainComment.user.fullName).toBe("Jane Doe");
    expect(mainComment.book.title).toBe("Clean Code");
    expect(mainComment.replies[0].user.fullName).toBe("John Smith");
  });

  it("should filter comments by bookId", async () => {
    const user = await User.create({ fullName: "User One", email: "user1@test.com" });
    const book1 = await Book.create({ title: "Book One", author: "Author A" });
    const book2 = await Book.create({ title: "Book Two", author: "Author B" });

    await Comment.create({ user: user._id, book: book1._id, content: "Comment on Book 1" });
    await Comment.create({ user: user._id, book: book2._id, content: "Comment on Book 2" });

    const res = await request(app)
      .get("/api/admin/comments")
      .query({ bookId: book1._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].content).toBe("Comment on Book 1");
  });

  it("should filter comments by userId", async () => {
    const user1 = await User.create({ fullName: "User One", email: "user1@test.com" });
    const user2 = await User.create({ fullName: "User Two", email: "user2@test.com" });
    const book = await Book.create({ title: "Shared Book", author: "Author" });

    await Comment.create({ user: user1._id, book: book._id, content: "User 1 Comment" });
    await Comment.create({ user: user2._id, book: book._id, content: "User 2 Comment" });

    const res = await request(app)
      .get("/api/admin/comments")
      .query({ userId: user2._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].content).toBe("User 2 Comment");
  });

  it("should filter by both bookId and userId when both query parameters are provided", async () => {
    const user1 = await User.create({ fullName: "User One", email: "user1@test.com" });
    const user2 = await User.create({ fullName: "User Two", email: "user2@test.com" });
    const book1 = await Book.create({ title: "Book One", author: "Author A" });
    const book2 = await Book.create({ title: "Book Two", author: "Author B" });

    await Comment.create({ user: user1._id, book: book1._id, content: "Target Comment" });
    await Comment.create({ user: user1._id, book: book2._id, content: "Wrong Book" });
    await Comment.create({ user: user2._id, book: book1._id, content: "Wrong User" });

    const res = await request(app)
      .get("/api/admin/comments")
      .query({ userId: user1._id.toString(), bookId: book1._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].content).toBe("Target Comment");
  });
});