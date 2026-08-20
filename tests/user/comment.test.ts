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
            send: jest.fn().mockImplementation(() => Promise.resolve({ data: { id: "test-id" }, error: null })),
        },
    })),
}));

jest.unstable_mockModule("../../config/cloudinary.js", async () => {
    return {
        cloudinary: { config: jest.fn() },
        storage: {
            _handleFile: (req: any, file: any, cb: any) => {
                file.stream.on("data", () => { });
                file.stream.on("end", () => {
                    cb(null, { path: "http://mock-cloudinary.com/image.jpg", size: 1234 });
                });
                file.stream.on("error", (err: Error) => cb(err));
            },
            _removeFile: (req: any, file: any, cb: any) => { cb(null); }
        },
    };
});

// Dynamic imports after module mocks execute
const { default: app } = await import("../../app.js");
const { Comment } = await import("../../models/comment.js");
const { Book } = await import("../../models/book.js");
const { User } = await import("../../models/user.js");
const { Category } = await import("../../models/category.js");

jest.setTimeout(15000);

describe("💬 User Comment Operations", () => {
    let user1Token: string;
    let user2Token: string;
    let testUser1: any;
    let testUser2: any;
    let testCategory: any;
    let testBook: any;
    let parentCommentId: string;
    let replyCommentId: string;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.DBURI!);
        }

        // 1. Isolate environment records
        await User.deleteMany({ email: /comment-test/ });
        await Category.deleteMany({ title: "Comment Category" });
        await Book.deleteMany({ title: "Comment Test Book" });
        await Comment.deleteMany({});

        // 2. Setup Test Entities
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

        user1Token = Jwt.sign({ _id: testUser1._id, role: "user" }, process.env.JWT_ACCESS_SECRET!);
        user2Token = Jwt.sign({ _id: testUser2._id, role: "user" }, process.env.JWT_ACCESS_SECRET!);

        testCategory = await Category.create({
            title: "Comment Category",
            description: "Category for comment testing"
        });

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
        await User.deleteMany({ email: /comment-test/ });
        await Category.deleteMany({ title: "Comment Category" });
        await Book.deleteMany({ title: "Comment Test Book" });
        await Comment.deleteMany({});
        await mongoose.connection.close();
    });

    // --- POST /api/user/comments/book/:bookId ---
    describe("POST /api/user/comments/book/:bookId", () => {
        it("Should allow a user to post a top-level comment", async () => {
            const res = await request(app)
                .post(`/api/user/comments/book/${testBook._id}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "This is a great book!" });

            expect(res.statusCode).toBe(201);
            expect(res.body.status).toBe(true);
            expect(res.body.message).toBe("Comment posted successfully.");
            expect(res.body.data.comment).toBe("This is a great book!");
            expect(res.body.data.book).toBe(testBook._id.toString());

            parentCommentId = res.body.data._id;
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
            expect(res.body.status).toBe(true);
            expect(res.body.data.parentComment).toBe(parentCommentId.toString());

            replyCommentId = res.body.data._id;

            // Verify transactional parent linkage
            const parent = await Comment.findById(parentCommentId);
            expect(parent!.replies).toContainEqual(new mongoose.Types.ObjectId(replyCommentId));
        });

        it("Should fail if target book document does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .post(`/api/user/comments/book/${fakeId}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "Irrelevant comment" });

            expect(res.statusCode).toBe(404);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toBe("Book not found.");
        });
    });

    // --- GET /api/user/comments/book/:bookId ---
    describe("GET /api/user/comments/book/:bookId", () => {
        it("Should return parent comments with paginated metadata", async () => {
            const res = await request(app)
                .get(`/api/user/comments/book/${testBook._id}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.data).toBeDefined();
            expect(Array.isArray(res.body.data.data)).toBe(true);
            expect(res.body.data.data.length).toBe(1);
        });
    });

    // --- GET /api/user/comments/:commentId ---
    describe("GET /api/user/comments/:commentId", () => {
        it("Should return single comment with deeply populated fields", async () => {
            const res = await request(app)
                .get(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.comment).toBe("This is a great book!");
            expect(res.body.data.replies.length).toBe(1);
        });
    });

    // --- PUT /api/user/comments/:commentId ---
    describe("PUT /api/user/comments/:commentId", () => {
        it("Should allow owners to update comment text content", async () => {
            const res = await request(app)
                .put(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "Actually, it is a fantastic book!" });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.data.comment).toBe("Actually, it is a fantastic book!");
        });

        it("Should prevent updates by users who do not own the comment", async () => {
            const res = await request(app)
                .put(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user2Token}`])
                .send({ comment: "Unauthorized modification attempt" });

            expect(res.statusCode).toBe(404);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toBe("Comment not found or you are not authorized to edit this resource.");
        });
    });

    // --- DELETE /api/user/comments/:commentId ---
    describe("DELETE /api/user/comments/:commentId", () => {
        it("Should reject deletion requests from non-owners or non-admins", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${replyCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(403);
            expect(res.body.status).toBe(false);
            expect(res.body.message).toBe("Unauthorized: You cannot remove this resource.");
        });

        it("Should soft-delete and mask comments that have active replies", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.message).toBe("Comment masked successfully.");

            const softDeletedParent = await Comment.findById(parentCommentId);
            expect(softDeletedParent!.isDeleted).toBe(true);
            expect(softDeletedParent!.comment).toBe("This comment has been removed.");
            expect(softDeletedParent!.user).toBeUndefined();
        });

        it("Should hard-delete comments that have no replies and unlink references", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${replyCommentId}`)
                .set("Cookie", [`accessToken=${user2Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe(true);
            expect(res.body.message).toBe("Comment permanently erased from ecosystem.");

            const hardDeletedReply = await Comment.findById(replyCommentId);
            expect(hardDeletedReply).toBeNull();
        });
    });
});