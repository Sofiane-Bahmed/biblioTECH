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

export const updateUserRoleService = async ({
    targetUserId,
    role,
    userId,
}) => {
    // 1. Prevent self-role modification
    if (String(userId) === String(targetUserId)) {
        return {
            status: false,
            code: 400,
            message: "You cannot change your own administrative role.",
        };
    }

    // 2. Atomically update user role
    const updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        { $set: { role } },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        return {
            status: false,
            code: 404,
            message: "User not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: `User role successfully updated to ${role}.`,
        data: updatedUser,
    };
};