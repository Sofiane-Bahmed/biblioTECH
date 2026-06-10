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
const { Comment } = await import("../models/comment.js");
const { Book } = await import("../models/book.js");
const { User } = await import("../models/user.js");
const { Category } = await import("../models/category.js");

jest.setTimeout(15000);

describe("💬 User Comment Operations", () => {
    let user1Token;
    let user2Token;
    let testUser1;
    let testUser2;
    let testCategory;
    let testBook;
    let parentCommentId;
    let replyCommentId;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI);
        }

        // Cleanup
        await User.deleteMany({ email: /comment-test/ });
        await Category.deleteMany({ title: "Comment Category" });
        await Book.deleteMany({ title: "Comment Test Book" });
        await Comment.deleteMany({});

        // 1. Setup Users
        testUser1 = await User.create({
            fullName: "User One",
            email: "user1-comment-test@test.com",
            password: "password123",
            role: "user"
        });

        testUser2 = await User.create({
            fullName: "User Two",
            email: "user2-comment-test@test.com",
            password: "password123",
            role: "user"
        });

        user1Token = Jwt.sign({ _id: testUser1._id, role: "user" }, process.env.JWT_ACCESS_SECRET);
        user2Token = Jwt.sign({ _id: testUser2._id, role: "user" }, process.env.JWT_ACCESS_SECRET);

        // 2. Setup Category
        testCategory = await Category.create({
            title: "Comment Category",
            description: "Category for comment testing"
        });

        // 3. Setup Book
        testBook = await Book.create({
            title: "Comment Test Book",
            isbn: "4444444444444",
            author: ["Author Comment"],
            category: [testCategory._id],
            description: "Description",
            copies_available: 5,
            pages: 100,
            language: "English",
            publication_year: 2023,
            cover_image: "http://mock-cloudinary.com/image.jpg"
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe("POST /api/user/comments/book/:bookId", () => {
        it("Should allow a user to post a top-level comment", async () => {
            const res = await request(app)
                .post(`/api/user/comments/book/${testBook._id}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "This is a great book!" });

            expect(res.statusCode).toBe(201);
            expect(res.body.comment).toBe("This is a great book!");
            expect(res.body.book).toBe(testBook._id.toString());
            parentCommentId = res.body._id;
        });

        it("Should allow a user to post a reply to a comment", async () => {
            const res = await request(app)
                .post(`/api/user/comments/book/${testBook._id}`)
                .set("Cookie", [`accessToken=${user2Token}`])
                .send({ 
                    comment: "I agree with User One!",
                    parentCommentId: parentCommentId
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.parentComment).toBe(parentCommentId.toString());
            replyCommentId = res.body._id;

            // Verify parent comment has the reply
            const parent = await Comment.findById(parentCommentId);
            expect(parent.replies).toContainEqual(new mongoose.Types.ObjectId(replyCommentId));
        });

        it("Should fail if book does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post(`/api/user/comments/book/${fakeId}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "Irrelevant comment" });

            expect(res.statusCode).toBe(404);
        });
    });

    describe("GET /api/user/comments", () => {
        it("Should return all comments with pagination", async () => {
            const res = await request(app)
                .get("/api/user/comments")
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("GET /api/user/comments/:id", () => {
        it("Should return a specific comment with populated fields and replies", async () => {
            const res = await request(app)
                .get(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.comment).toBe("This is a great book!");
            expect(res.body.replies.length).toBe(1);
            expect(res.body.replies[0].comment).toBe("I agree with User One!");
        });
    });

    describe("PUT /api/user/comments/:id", () => {
        it("Should allow a user to edit their own comment", async () => {
            const res = await request(app)
                .put(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ commentUpdate: "Actually, it is a fantastic book!" });

            expect(res.statusCode).toBe(200);
            expect(res.body.comment.comment).toBe("Actually, it is a fantastic book!");
        });

        it("Should prevent a user from editing someone else's comment", async () => {
            const res = await request(app)
                .put(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user2Token}`])
                .send({ commentUpdate: "Hack attempt" });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("FORBIDDEN: You can only edit your own comments");
        });
    });

    describe("DELETE /api/user/comments/:id", () => {
        it("Should prevent unauthorized deletion", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${replyCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]); // User 1 trying to delete User 2's reply

            expect(res.statusCode).toBe(403);
        });

        it("Should allow a user to delete their own comment and cleanup replies", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Comment and its replies deleted");

            // Verify both parent and reply are gone
            const parent = await Comment.findById(parentCommentId);
            const reply = await Comment.findById(replyCommentId);
            expect(parent).toBeNull();
            expect(reply).toBeNull();

            // Verify clean-up in Book and User
            const book = await Book.findById(testBook._id);
            expect(book.comments).not.toContain(parentCommentId);
        });
    });

    describe("Security - Authenticated Only", () => {
        it("Should reject unauthenticated requests", async () => {
            const res = await request(app)
                .get("/api/user/comments");

            expect(res.statusCode).toBe(401);
        });
    });
});
