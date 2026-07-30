import { Response } from "express";
import mongoose from "mongoose";

import { Reservation } from "../../models/reservation.js";
import { Book } from "../../models/book.js";
import { User } from "../../models/user.js";
import { AuditLog } from "../../models/audit-log.js";

import asyncHandler from "../../utils/async-handler.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { TIME_CONSTANTS } from "../../constants/library-rules.js";
import {
    extendPickupDeadlineBody,
    extendPickupDeadlineParams,
    placeStaffHoldBody
} from "../../validations/librarian/reservation/reservation-types.js";

const { MS } = TIME_CONSTANTS;

export const extendPickupDeadline = asyncHandler(async (
    req: AuthenticatedRequest<extendPickupDeadlineParams, extendPickupDeadlineBody, any>,
    res: Response
): Promise<void> => {
    const { reservationId } = req.params;
    const { extensionHours, reason } = req.body;
    const staffId = req.user!._id;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
        res.status(404).json({ success: false, message: "Reservation not found." });
        return;
    }

    if (reservation.status !== "READY_FOR_PICKUP") {
        res.status(400).json({
            success: false,
            message: `Cannot extend deadline. Reservation status is '${reservation.status}', expected 'READY_FOR_PICKUP'.`,
        });
        return;
    }

    const currentExpiry = reservation.expires_at ? new Date(reservation.expires_at) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + extensionHours * MS);

    reservation.expires_at = newExpiry;
    await reservation.save();

    // Audit Log
    await AuditLog.create({
        action: "MANUAL_HOLD_EXTENSION",
        performedBy: staffId,
        targetUser: reservation.user,
        targetResource: "Reservation",
        resourceId: reservation._id,
        details: {
            oldExpiry: currentExpiry,
            newExpiry, extensionHours
        },
        reason,
    });

    res.status(200).json({
        success: true,
        message: `Pickup deadline extended by ${extensionHours} hours. New deadline: ${newExpiry.toISOString()}`,
        data: reservation,
    });
});

export const placeStaffHold = asyncHandler(async (
    req: AuthenticatedRequest<any, placeStaffHoldBody, any>,
    res: Response
): Promise<void> => {
    const { userId, bookId, reason } = req.body;
    const staffId = req.user!._id;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        res.status(404).json({ success: false, message: "Patron account not found." });
        return;
    }

    const book = await Book.findById(bookId);
    if (!book) {
        res.status(404).json({ success: false, message: "Book not found." });
        return;
    }

    // Prevent duplicate active holds
    const existingHold = await Reservation.findOne({
        user: userId,
        book: bookId,
        status: { $in: ["PENDING", "READY_FOR_PICKUP"] },
    });

    if (existingHold) {
        res.status(400).json({ success: false, message: "Patron already has an active hold on this book." });
        return;
    }

    const newReservation = await Reservation.create({
        user: userId,
        book: bookId,
        status: "PENDING",
    });

    // Audit Log
    await AuditLog.create({
        action: "STAFF_PLACE_HOLD",
        performedBy: staffId,
        targetUser: userId,
        targetResource: "Reservation",
        resourceId: newReservation._id,
        details: { bookId },
        reason,
    });

    res.status(201).json({
        success: true,
        message: "Manual reservation placed successfully on behalf of patron.",
        data: newReservation,
    });
});