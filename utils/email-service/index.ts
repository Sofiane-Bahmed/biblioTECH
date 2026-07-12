import { Resend, CreateEmailResponseSuccess } from "resend";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.RESEND_API_KEY || "";
if (!apiKey) {
    console.warn("[Warning]: RESEND_API_KEY is missing from your environment configuration.");
}

const resend = new Resend(apiKey);

export const sendEmailNotification = async (
    toEmail: string,
    subject: string,
    text: string
): Promise<CreateEmailResponseSuccess> => {
    try {
        const { data, error } = await resend.emails.send({
            from: "Library <onboarding@resend.dev>",
            to: toEmail,
            subject: subject,
            text: text,
        });

        if (error) {
            throw new Error(error.message);
        }

        return data;
    } catch (error: any) {
        console.error("Resend API Error:", error.message || error);
        throw error;
    }
};