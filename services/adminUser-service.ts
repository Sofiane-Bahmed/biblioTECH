import { User } from "../models/user.js";

export const createStaffService = async ({
    fullName,
    email,
    password,
    role = "librarian",
    phone,
}) => {
    const normalizedEmail = email.toLowerCase();

    // 1. Check for existing user by email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        return {
            status: false,
            code: 409,
            message: "A user with this email address already exists.",
        };
    }

    // 2. Create staff record (password hashing handled in pre-save hook or schema)
    const staffMember = await User.create({
        fullName,
        email: normalizedEmail,
        password,
        role,
        phone,
    });

    // Exclude password from returned payload if needed
    const staffResponse = staffMember.toObject ? staffMember.toObject() : staffMember;
    delete staffResponse.password;

    return {
        status: true,
        code: 201,
        message: `Staff member created successfully with role '${role}'.`,
        data: staffResponse,
    };
};