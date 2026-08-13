import { FilterQuery } from "mongoose";

import { Borrow, IBorrow } from "../../models/borrow.js";
import { User } from "../../models/user.js";
import { getPaginatedData } from "../../utils/paginate.js";

export const getMyBorrowsService = async ({
    userId,
    status,
    overdue,
    req,
}) => {
    const dbQuery: FilterQuery<IBorrow> = { user: userId };

    if (status) {
        dbQuery.status = status;
    }

    // Handle boolean/string query parameters for overdue filtering
    if (overdue === true || overdue === "true") {
        dbQuery.status = "ACTIVE";
        dbQuery.due_date = { $lt: new Date() };
    }

    const result = await getPaginatedData({
        model: Borrow,
        query: dbQuery,
        populate: [
            {
                path: "book",
                select: "title author",
            },
        ],
        req,
    });

    if (!result || !result.data || !result.data.length) {
        return {
            status: true,
            code: 200,
            message: "No borrowing history found.",
            data: {
                ...result,
                data: [],
            },
        };
    }

    return {
        status: true,
        code: 200,
        message: "User borrow records retrieved successfully.",
        data: result,
    };
};

export const updateMyProfileService = async ({
    userId,
    updateData,
}) => {
    // Prevent sensitive/restricted fields from being updated directly
    delete updateData.role;
    delete updateData.password;
    delete updateData.email;

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
    )

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
        message: "Profile updated successfully.",
        data: { user },
    };
};

export const getMyProfileService = async ({ userId }) => {
    const userProfile = await User
        .findById(userId)
        .lean();

    if (!userProfile) {
        return {
            status: false,
            code: 404,
            message: "User profile not found.",
        };
    }

    return {
        status: true,
        code: 200,
        message: "Profile details retrieved successfully.",
        data: { profile: userProfile },
    };
};