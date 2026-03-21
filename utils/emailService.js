import { sendEmailNotification } from "./mailer";

export const sendWelcomeEmail = async (user) => {
  try {
    const subject = 'Welcome to the Library';
    const text = `Dear ${user.fullName},\n\nWelcome to the library! We hope you enjoy our collection of books.\n\nSincerely,\nThe Library Team`;
    
    sendEmailNotification(user.email, subject, text);
  } catch (error) {
    console.error(`Post-registration email failed for ${user.email}:`, error);
  }
};