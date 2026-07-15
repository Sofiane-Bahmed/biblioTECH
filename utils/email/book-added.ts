import { sendEmailNotification } from "../../config/resend.js";

interface SubscriberInput {
    email: string;
}

interface BookDetailsInput {
    title: string;
    author: string | string[];
}

export const sendBookAddedEmail = async (
    subscriber: SubscriberInput,
    { title, author }: BookDetailsInput
): Promise<void> => {
    const subject = 'New Book Added';

    const text = `A new book titled "${title}" by ${author} has been added to the library. Check it out now!`;

    await sendEmailNotification(subscriber.email, subject, text);
};