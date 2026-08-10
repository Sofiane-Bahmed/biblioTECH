import { User } from "../models/user.js";

import { sendWelcomeEmail } from "../utils/email/welcome.js";

export const registerUserService = async (input) => {
    const { fullName, password, email, phone, confirmPassword } = input;


    // Assign admin role if first user in database
    const isFirstUser = (await User.countDocuments()) === 0;
    const role = isFirstUser ? "admin" : "user";

    // Create user
    const newUser = await User.create({
        fullName,
        password,
        email: email.toLowerCase(),
        phone,
        role,
    });

    // Trigger welcome email in background (non-blocking)
    sendWelcomeEmail(newUser).catch((err) => {
        console.error(`Failed to send welcome email to ${newUser.email}:`, err);
    });

    return {
        status: true,
        code: 201,
        message: "User registered successfully.",
        data: { user: newUser },
    };
};