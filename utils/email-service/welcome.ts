import { sendEmailNotification } from "./index.js";

interface WelcomeUserInput {
  email: string;
  fullName: string;
}

export const sendWelcomeEmail = async (user: WelcomeUserInput): Promise<void> => {
  try {
    const subject = 'Welcome to the Library';
    const text = `Dear ${user.fullName},\n\nWelcome to the library! We hope you enjoy our collection of books.\n\nSincerely,\nThe Library Team`;

    await sendEmailNotification(user.email, subject, text);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error(`Post-registration email failed for ${user.email}:`, error);
  }
};