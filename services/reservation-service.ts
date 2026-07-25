import { ClientSession, Types } from "mongoose";

import { Book } from "../models/book.js";
import { Reservation } from "../models/reservation.js";
import { User } from "../models/user.js";

import { sendHoldReadyEmail } from "../utils/email/hold-ready-email.js";

import { TIME_CONSTANTS } from "../constants/library-rules.js";

const { PICKUP_WINDOW_HOURS, MS } = TIME_CONSTANTS

export const processNextInLineOrRestock = async (
    bookId: string | Types.ObjectId,
    session?: ClientSession
): Promise<void> => {

    const nextReservation = await Reservation.findOne({
        book: bookId,
        status: "PENDING",
    })
        .sort({ createdAt: 1 }) // Primary FIFO queue ordering
        .session(session || null);

    if (!nextReservation) {
        await Book.findByIdAndUpdate(
            bookId,
            { $inc: { copies_available: 1 } },
            { session }
        );
        return;
    }

    const holdExpiration = new Date(Date.now() + PICKUP_WINDOW_HOURS * MS);

    nextReservation.status = "READY_FOR_PICKUP";
    nextReservation.expires_at = holdExpiration;
    await nextReservation.save({ session });

    const user = await User.findById(nextReservation.user).session(session || null);

    if (user) {
        // Fire-and-forget email dispatch so network latency doesn't block controller flow
        const book = await Book.findById(bookId).select("title").session(session || null);

        if (book) {
            sendHoldReadyEmail(user.email, book.title, holdExpiration).catch((err) =>
                console.error(`[Email Error] Failed sending hold notification for reservation #${nextReservation._id}:`, err)
            );
        }
    }
};