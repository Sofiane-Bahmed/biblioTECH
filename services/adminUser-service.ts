import mongoose from "mongoose";
import { User } from "../models/user.js";
import { AuditLog } from "../models/audit-log.js";
import { Borrow } from "../models/borrow.js";

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

export const getUsersService = async ({
    page = 1,
    limit = 10,
}) => {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Execute parallel queries for data and total count
    const [users, totalUsers] = await Promise.all([
        User.find().skip(skip).limit(limitNum),
        User.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalUsers / limitNum) || 0;

    if (!users || users.length === 0) {
        return {
            status: true,
            code: 200,
            message: "No users found in this matching viewport slice.",
            data: {
                users: [],
                pagination: {
                    count: 0,
                    currentPage: pageNum,
                    totalPages: 0,
                    totalUsers: 0,
                },
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "Users fetched successfully.",
        data: {
            users,
            pagination: {
                count: users.length,
                currentPage: pageNum,
                totalPages,
                totalUsers,
            },
        },
    };
};

export const blockUserService = async ({
    userId,
    reason = "Administrative block",
    staffId,
}) => {
    // 1. Verify user existence
    const user = await User.findById(userId);
    if (!user) {
        return {
            status: false,
            code: 404,
            message: "User not found.",
        };
    }

    // 2. Business rule checks
    if (user.isBlocked) {
        return {
            status: false,
            code: 400,
            message: "User is already blocked.",
        };
    }

    if (user.role === "admin") {
        return {
            status: false,
            code: 400,
            message: "You cannot block an admin user.",
        };
    }

    const currentDate = new Date();
    if (user.suspension_date && user.suspension_date > currentDate) {
        return {
            status: false,
            code: 400,
            message: `User is already suspended until ${user.suspension_date.toISOString()}.`,
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 3. Atomic status update with optimistic concurrency conditions
        const blockedUser = await User.findOneAndUpdate(
            {
                _id: userId,
                isBlocked: false,
                role: { $ne: "admin" },
                $or: [
                    { suspension_date: { $exists: false } },
                    { suspension_date: { $lte: currentDate } },
                ],
            },
            { $set: { isBlocked: true } },
            { session, new: true, runValidators: true }
        );

        if (!blockedUser) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "User could not be blocked. Please check the user status and try again.",
            };
        }

        // 4. Audit Log entry (if staff member performing action)
        if (staffId) {
            await AuditLog.create(
                [
                    {
                        action: "BLOCK_USER",
                        performedBy: staffId,
                        targetUser: userId,
                        targetResource: "User",
                        resourceId: userId,
                        reason,
                    },
                ],
                { session }
            );
        }

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: "User blocked successfully.",
            data: blockedUser,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const unblockUserService = async ({
    userId,
    reason = "Administrative unblock",
    staffId,
}) => {
    // 1. Check user existence and block status before transaction
    const existingUser = await User.findById(userId);
    if (!existingUser) {
        return {
            status: false,
            code: 404,
            message: "User not found.",
        };
    }

    if (!existingUser.isBlocked) {
        return {
            status: false,
            code: 400,
            message: "User is not currently blocked.",
        };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Atomically unblock user
        const unblockedUser = await User.findOneAndUpdate(
            { _id: userId, isBlocked: true },
            { $set: { isBlocked: false } },
            { session, new: true, runValidators: true }
        );

        if (!unblockedUser) {
            await session.abortTransaction();
            session.endSession();
            return {
                status: false,
                code: 400,
                message: "Failed to unblock user. The account status may have changed.",
            };
        }

        // 3. Create Audit Log entry if performed by staff
        if (staffId) {
            await AuditLog.create(
                [
                    {
                        action: "UNBLOCK_USER",
                        performedBy: staffId,
                        targetUser: userId,
                        targetResource: "User",
                        resourceId: userId,
                        reason,
                    },
                ],
                { session }
            );
        }

        await session.commitTransaction();
        session.endSession();

        return {
            status: true,
            code: 200,
            message: "User unblocked successfully.",
            data: unblockedUser,
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const deleteUserService = async ({ userId }) => {
    // 1. Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        return {
            status: false,
            code: 404,
            message: "User not found.",
        };
    }

    // 2. Prevent deletion if active borrow records exist
    const activeBorrows = await Borrow.exists({
        user: userId,
        status: { $in: ["borrowed", "overdue"] },
    });

    if (activeBorrows) {
        return {
            status: false,
            code: 400,
            message: "Cannot delete user with active borrowed books.",
        };
    }

    // 3. Prevent deletion if outstanding fines remain
    if (user.outstanding_fines && user.outstanding_fines > 0) {
        return {
            status: false,
            code: 400,
            message: `Cannot delete user with outstanding fines ($${user.outstanding_fines.toFixed(2)}).`,
        };
    }

    // 4. Delete user account
    await User.findByIdAndDelete(userId);

    return {
        status: true,
        code: 200,
        message: "User deleted successfully.",
    };
};

export const getUserByIdService = async ({ userId }) => {
    const user = await User.findById(userId);

    if (!user) {
        return {
            status: false,
            code: 404,
            message: "User not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "User details retrieved successfully.",
        data: { user },
    };
};

