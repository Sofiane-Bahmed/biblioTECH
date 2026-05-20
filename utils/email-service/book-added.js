import { sendEmailNotification } from "./index.js";

export const sendBookAddedEmail = async (subscriber, { title, author }) => {
    const subject = 'New Book Added';
    const text = `A new book titled "${title}" by ${author} has been added to the library. Check it out now!`;
    sendEmailNotification(subscriber.email, subject, text);
}