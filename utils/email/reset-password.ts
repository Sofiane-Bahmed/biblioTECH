import { sendEmailNotification } from "../../config/resend.js";

interface PasswordResetUserInput {
    email: string;
    fullName: string;
}

export const sendPasswordResetEmail = async (
    user: PasswordResetUserInput,
    resetToken: string
): Promise<void> => {
    try {
        const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
        const subject = 'Password Reset Request';
        const message = `Dear ${user.fullName},\n\nYou have requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nSincerely,\nThe Library Team`;

        await sendEmailNotification(user.email, subject, message);
        console.log(`Password reset email sent to ${user.email}`);

    } catch (error) {
        console.error(`Failed to send password reset email to ${user.email}:`, error);
        throw error;
    }
};