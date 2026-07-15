import { User } from "../models/user.js";
import { sendBookAddedEmail } from "../utils/email/book-added.js";

interface BookDetailsNotificationInput {
    title: string;
    author: string | string[];
}

export const notifySubscribersAboutNewBook = async (
    bookDetails: BookDetailsNotificationInput
): Promise<void> => {
    const subscribers = await User.find({ subscribed: true });

    await Promise.all(
        subscribers.map((subscriber) =>
            sendBookAddedEmail(subscriber, bookDetails)
        )
    );
};