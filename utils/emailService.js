import { sendEmailNotification } from "./mailer.js";

export const sendWelcomeEmail = async (user) => {
  try {
    const subject = 'Welcome to the Library';
    const text = `Dear ${user.fullName},\n\nWelcome to the library! We hope you enjoy our collection of books.\n\nSincerely,\nThe Library Team`;

    await sendEmailNotification(user.email, subject, text);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error(`Post-registration email failed for ${user.email}:`, error);
  }
};