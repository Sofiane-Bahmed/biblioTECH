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

// Dynamic imports after module mocks executed
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

        // Cleanup previous state
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

        user1Token = Jwt.sign({ _id: testUser1._id, role: "user" }, process.env.JWT_ACCESS_SECRET!);
        user2Token = Jwt.sign({ _id: testUser2._id, role: "user" }, process.env.JWT_ACCESS_SECRET!);

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

    // --- POST /api/user/comments/book/:bookId ---
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

            // Verify parent structural node links the children array element
            const parent = await Comment.findById(parentCommentId);
            expect(parent!.replies).toContainEqual(new mongoose.Types.ObjectId(replyCommentId));
        });

        it("Should fail if the book does not exist", async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            const res = await request(app)
                .post(`/api/user/comments/book/${fakeId}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "Irrelevant comment" });

            expect(res.statusCode).toBe(404);
        });
    });

    // --- GET /api/user/comments/book/:bookId ---
    describe("GET /api/user/comments/book/:bookId", () => {
        it("Should return parent comments with a paginated layer wrapper", async () => {
            const res = await request(app)
                .get(`/api/user/comments/book/${testBook._id}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
            // Returns parent nodes only (the reply is deep populated inside the parent array field)
            expect(res.body.data.length).toBe(1);
        });
    });

    // --- GET /api/user/comments/:commentId ---
    describe("GET /api/user/comments/:commentId", () => {
        it("Should return a single comment document with deep population mappings resolved", async () => {
            const res = await request(app)
                .get(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.comment).toBe("This is a great book!");
            expect(res.body.replies.length).toBe(1);
        });
    });

    // --- PUT /api/user/comments/:commentId ---
    describe("PUT /api/user/comments/:commentId", () => {
        it("Should allow owners to update their own message fields strings", async () => {
            const res = await request(app)
                .put(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`])
                .send({ comment: "Actually, it is a fantastic book!" });

            expect(res.statusCode).toBe(200);
            expect(res.body.comment.comment).toBe("Actually, it is a fantastic book!");
        });

        it("Should prevent editing resource streams belonging to distinct users", async () => {
            const res = await request(app)
                .put(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user2Token}`])
                .send({ comment: "Malicious Injection Payload" });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe("Comment not found or you are not authorized to edit this resource.");
        });
    });

    // --- DELETE /api/user/comments/:commentId ---
    describe("DELETE /api/user/comments/:commentId", () => {
        it("Should throw a 403 authorization guard barrier for unlinked user interactions", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${replyCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe("Unauthorized: You cannot remove this resource.");
        });

        it("Should fallback to Soft Delete masking algorithms if comments contain active reply blocks", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${parentCommentId}`)
                .set("Cookie", [`accessToken=${user1Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Comment masked successfully.");

            const softDeletedParent = await Comment.findById(parentCommentId);
            expect(softDeletedParent!.isDeleted).toBe(true);
            expect(softDeletedParent!.comment).toBe("This comment has been removed.");
            expect(softDeletedParent!.user).toBeUndefined(); // $unset mechanism verified
        });

        it("Should run Hard Delete sequence pathways instantly if target logs contain no children nodes", async () => {
            const res = await request(app)
                .delete(`/api/user/comments/${replyCommentId}`)
                .set("Cookie", [`accessToken=${user2Token}`]);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe("Comment permanently erased from ecosystem.");

            const hardDeletedReply = await Comment.findById(replyCommentId);
            expect(hardDeletedReply).toBeNull();
        });
    });
});