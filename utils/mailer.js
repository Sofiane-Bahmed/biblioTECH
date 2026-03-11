import { transporter } from "../config/mail.config";

export const sendEmailNotification = async (toEmail, subject, text) => {
    try {
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
        throw new Error('Email could not be sent.');
    }
};