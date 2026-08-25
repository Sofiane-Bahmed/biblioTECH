import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest } from "@jest/globals";

import { User } from "../../models/user.js";
import { Book } from "../../models/book.js";
import { Reservation } from "../../models/reservation.js";
import { AuditLog } from "../../models/audit-log.js";
import { librarianReservationRouter } from "../../routers/librarian/reservation.js";
import { processNextInLineOrRestock } from "../../services/librarian/reservation.js";

// Mock email utility to prevent actual sends and track calls
jest.mock("../../utils/email/hold-ready-email.js", () => ({
    sendHoldReadyEmail: jest.fn().mockResolvedValue(true as never),
}));

// Mock auth middleware to inject staff user into req.user
jest.mock("../../middlewares/validate.js", () => ({
    validate: () => (req: any, res: any, next: any) => next(),
}));

let mongoServer: MongoMemoryServer;
let app: express.Application;
let staffId: mongoose.Types.ObjectId;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());

    // Inject mock staff user context into all requests
    staffId = new mongoose.Types.ObjectId();
    app.use((req: any, _res, next) => {
        req.user = { _id: staffId.toString(), role: "LIBRARIAN" };
        next();
    });

    app.use("/api/librarian/reservations", librarianReservationRouter);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
    await Book.deleteMany({});
    await Reservation.deleteMany({});
    await AuditLog.deleteMany({});
});

describe("Librarian Reservation Controller & Services", () => {

    describe("POST /api/librarian/reservations/manual (placeStaffHold)", () => {
        it("should place a hold on behalf of patron and log audit entry", async () => {
            const user = await User.create({ email: "patron@test.com", name: "Patron" });
            const book = await Book.create({ title: "Clean Code", copies_available: 1 });

            const res = await request(app)
                .post("/api/librarian/reservations/manual")
                .send({ userId: user._id.toString(), bookId: book._id.toString(), reason: "Staff assistance" });

            expect(res.status).toBe(201);
            expect(res.body.status).toBe(true);

            const createdReservation = await Reservation.findOne({ user: user._id, book: book._id });
            expect(createdReservation).not.toBeNull();
            expect(createdReservation?.status).toBe("PENDING");

            const audit = await AuditLog.findOne({ action: "STAFF_PLACE_HOLD" });
            expect(audit).not.toBeNull();
            expect(audit?.performedBy.toString()).toBe(staffId.toString());
        });

        it("should reject duplicate active holds for the same book/user", async () => {
            const user = await User.create({ email: "patron@test.com", name: "Patron" });
            const book = await Book.create({ title: "Clean Code", copies_available: 1 });

            await Reservation.create({ user: user._id, book: book._id, status: "PENDING" });

            const res = await request(app)
                .post("/api/librarian/reservations/manual")
                .send({ userId: user._id.toString(), bookId: book._id.toString(), reason: "Duplicate attempt" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("already has an active hold");
        });
    });

    describe("PATCH /api/librarian/reservations/:reservationId/extend (extendPickupDeadline)", () => {
        it("should extend pickup deadline for READY_FOR_PICKUP reservation", async () => {
            const user = await User.create({ email: "patron@test.com", name: "Patron" });
            const book = await Book.create({ title: "Clean Code", copies_available: 1 });
            const initialExpiry = new Date();

            const reservation = await Reservation.create({
                user: user._id,
                book: book._id,
                status: "READY_FOR_PICKUP",
                expires_at: initialExpiry,
            });

            const res = await request(app)
                .patch(`/api/librarian/reservations/${reservation._id}/extend`)
                .send({ extensionHours: 24, reason: "Illness delay" });

            expect(res.status).toBe(200);

            const updated = await Reservation.findById(reservation._id);
            const expectedTime = new Date(initialExpiry.getTime() + 24 * 60 * 60 * 1000).getTime();
            expect(new Date(updated!.expires_at!).getTime()).toBeCloseTo(expectedTime, -2);
        });

        it("should fail if reservation is in PENDING status", async () => {
            const user = await User.create({ email: "patron@test.com", name: "Patron" });
            const book = await Book.create({ title: "Clean Code", copies_available: 1 });

            const reservation = await Reservation.create({ user: user._id, book: book._id, status: "PENDING" });

            const res = await request(app)
                .patch(`/api/librarian/reservations/${reservation._id}/extend`)
                .send({ extensionHours: 24, reason: "Invalid status extension" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("expected 'READY_FOR_PICKUP'");
        });
    });

    describe("PATCH /api/librarian/reservations/:reservationId/reorder (forceQueuePosition)", () => {
        it("should bump a reservation to position 1 and adjust timestamps", async () => {
            const book = await Book.create({ title: "Design Patterns", copies_available: 0 });
            const u1 = await User.create({ email: "u1@test.com" });
            const u2 = await User.create({ email: "u2@test.com" });

            // Create two sequential pending holds
            const r1 = await Reservation.create({ user: u1._id, book: book._id, status: "PENDING", createdAt: new Date(Date.now() - 20000) });
            const r2 = await Reservation.create({ user: u2._id, book: book._id, status: "PENDING", createdAt: new Date(Date.now() - 10000) });

            // Move r2 (currently #2) to position #1
            const res = await request(app)
                .patch(`/api/librarian/reservations/${r2._id}/reorder`)
                .send({ newPosition: 1, reason: "VIP Patron Override" });

            expect(res.status).toBe(200);

            const holds = await Reservation.find({ book: book._id, status: "PENDING" }).sort({ createdAt: 1 });
            expect(holds[0]._id.toString()).toBe(r2._id.toString());
            expect(holds[1]._id.toString()).toBe(r1._id.toString());
        });
    });

    describe("processNextInLineOrRestock helper", () => {
        it("should transition next pending reservation to READY_FOR_PICKUP", async () => {
            const user = await User.create({ email: "patron@test.com", name: "Patron" });
            const book = await Book.create({ title: "Refactoring", copies_available: 0 });

            const res = await Reservation.create({ user: user._id, book: book._id, status: "PENDING" });

            await processNextInLineOrRestock(book._id);

            const updatedRes = await Reservation.findById(res._id);
            expect(updatedRes?.status).toBe("READY_FOR_PICKUP");
            expect(updatedRes?.expires_at).toBeDefined();
        });

        it("should increment book copies_available if no pending reservations exist", async () => {
            const book = await Book.create({ title: "Refactoring", copies_available: 2 });

            await processNextInLineOrRestock(book._id);

            const updatedBook = await Book.findById(book._id);
            expect(updatedBook?.copies_available).toBe(3);
        });
    });
});