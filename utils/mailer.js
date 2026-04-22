import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config(); 

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmailNotification = async (toEmail, subject, text) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Library <onboarding@resend.dev>', 
            to: toEmail,
            subject: subject,
            text: text,
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    } catch (error) {
        console.error("Resend API Error:", error.message);
        throw error;
    }
};