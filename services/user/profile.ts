import { FilterQuery } from "mongoose";

import { Borrow, IBorrow } from "../../models/borrow.js";
import { User } from "../../models/user.js";
import { getPaginatedData } from "../../utils/paginate.js";

export const getMyBorrowsService = async ({
  userId,
  status,
  overdue,
  req,
}: {
  userId: string;
  status?: string;
  overdue?: boolean | string;
  req: any;
}) => {
  const dbQuery: FilterQuery<IBorrow> = { user: userId };

  if (status) {
    dbQuery.status = status;
  }

  if (overdue === true || overdue === "true") {
    dbQuery.status = "ACTIVE";
    dbQuery.due_date = { $lt: new Date() };
  }

  const paginatedResult = await getPaginatedData({
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

  const hasData = paginatedResult && paginatedResult.data && paginatedResult.data.length > 0;

  return {
    status: true,
    code: 200,
    message: hasData ? "User borrow records retrieved successfully." : "No borrowing history found.",
    data: paginatedResult,
  };
};

export const updateMyProfileService = async ({
  userId,
  updateData,
}: {
  userId: string;
  updateData: Record<string, any>;
}) => {
  // Destructure to sanitize forbidden attributes safely without direct parameter mutation
  const { role, password, ...allowedUpdates } = updateData;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  ).select("-password");

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

export const getMyProfileService = async ({ userId }: { userId: string }) => {
  const userProfile = await User.findById(userId);

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