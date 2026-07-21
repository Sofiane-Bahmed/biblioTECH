import { sendEmailNotification } from "../../config/resend.js";

export interface PickupReadyUserInput {
    email: string;
    name: string;
}

export interface PickupReadyBookInput {
    title: string;
}

export const sendPickupReadyEmail = (
    user: PickupReadyUserInput,
    book: PickupReadyBookInput,
    pickupDeadline: Date
): Promise<any> => {
    // Format the date nicely for the reader (e.g., "July 23, 2026 at 5:00 PM")
    const formattedDeadline = pickupDeadline.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    const subject = `Your Book is Ready for Pickup: ${book.title}`;
    const message = `Dear ${user.name},\n\nGreat news! Your borrow request for "${book.title}" has been approved and is now waiting for you at the front desk.\n\nPlease pick up your book by ${formattedDeadline}. If it is not collected before this time, your reservation will automatically expire and the book will be returned to inventory.\n\nWe look forward to seeing you!\n\nBest regards,\nThe Library Team`;

    return sendEmailNotification(user.email, subject, message);
};