import { User } from "../models/user.js";
import { sendBookAddedEmail } from "../utils/email-service/book-added.js";

export const notifySubscribersAboutNewBook = async (bookDetails) => {
    const subscribers = await User.find({ subscribed: true });

    // Fire all emails in parallel
    await Promise.all(
        subscribers.map(subscriber => sendBookAddedEmail(subscriber, bookDetails))
    );
};