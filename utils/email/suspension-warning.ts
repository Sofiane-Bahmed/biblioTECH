import { sendEmailNotification } from "../../config/resend.js";

interface SuspensionWarningUserInput {
    email: string;
    name: string;
}

interface SuspensionWarningBookInput {
    title: string;
}

export const sendSuspensionWarningEmail = (
    user: SuspensionWarningUserInput,
    book: SuspensionWarningBookInput
): Promise<any> => {
    const subject = "Book Return Delay Warning";
    const message = `Dear ${user.name},\n\nThis is a reminder that you have not returned the book "${book.title}" on time. Please return it as soon as possible to avoid further penalties.\n\nThank you for your attention to this matter.\n\nBest regards,\nThe Library Team`;

    return sendEmailNotification(user.email, subject, message);
};