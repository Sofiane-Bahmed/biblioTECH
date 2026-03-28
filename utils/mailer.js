import { transporter } from "../config/mail.config.js";

export const sendEmailNotification = async (toEmail, subject, text) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error("Email credentials missing in .env");
        }
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject,
            text
        };

        const info = await transporter.sendMail(mailOptions);
        return info;

    } catch (error) {
        console.error(`Mailer Error: ${error.message}`);
    }
};