import { Types } from "mongoose";

import { sendEmailNotification } from "../../config/resend.js";
import { User } from "../../models/user.js";

export interface HoldReadyBookInput {
    title: string;
}

export const sendHoldReadyEmail = async (
    userId: string | Types.ObjectId,
    bookTitle: string,
    expiresAt?: Date
): Promise<any> => {
    const user = await User.findById(userId).select("email name");

    if (!user) {
        console.error(`[Email Error] Failed to send hold notification: User #${userId} not found.`);
        return;
    }

    // Fallback to 48 hours from now if expiresAt is not provided explicitly
    const deadline = expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000);

    const formattedDeadline = deadline.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    const subject = `Reserved Book Available: ${bookTitle}`;
    const message = `Dear ${user.fullName || "Valued Member"},\n\nGreat news! A copy of "${bookTitle}" that you requested on the waiting list has just been returned and is now reserved for you at the front desk.\n\nPlease pick up your book by ${formattedDeadline}. If it is not collected before this time, your hold will automatically expire and the reservation will pass to the next member in line.\n\nThank you for using our library service!\n\nBest regards,\nThe Library Team`;

    return sendEmailNotification(user.email, subject, message);
};