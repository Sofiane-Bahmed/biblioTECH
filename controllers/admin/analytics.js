import { Book } from "../../models/book.js";
import { User } from "../../models/user.js";
import { BorrowBook } from "../../models/borrow.js";
import asyncHandler from "../../utils/async-handler.js";

// view libary statistics
export const getLibraryStatistics = asyncHandler(async (req, res) => {
    const [totalBooks, totalUsers, advancedMetrics] = await Promise.all([
        // Fast metadata reads for absolute totals
        Book.countDocuments(),
        User.countDocuments({ subscribed: true }),
        BorrowBook.aggregate([
            {
                $facet: {
                    "loanStatuses": [
                        {
                            $group: {
                                _id: null,
                                // 1. Active: Counts documents where return_date is missing or null
                                activeBorrows: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $or: [
                                                    { $eq: [{ $type: "$return_date" }, "missing"] },
                                                    { $eq: ["$return_date", null] }
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                },
                                overdueBorrows: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {
                                                        $or: [
                                                            { $eq: [{ $type: "$return_date" }, "missing"] },
                                                            { $eq: ["$return_date", null] }
                                                        ]
                                                    },
                                                    { $lt: ["$due_date", new Date()] } // Due date is in the past
                                                ]
                                            },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    "topBorrowers": [
                        { $group: { _id: "$user", borrowCount: { $sum: 1 } } },
                        { $sort: { borrowCount: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "_id",
                                foreignField: "_id",
                                as: "userDetails"
                            }
                        },
                        { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                _id: 0,
                                userId: "$_id",
                                borrowCount: 1,
                                name: "$userDetails.name",
                                email: "$userDetails.email"
                            }
                        }
                    ],
                    "categoryPopularity": [
                        {
                            $lookup: {
                                from: "books",
                                localField: "book",
                                foreignField: "_id",
                                as: "bookDetails"
                            }
                        },
                        { $unwind: "$bookDetails" },
                        { $unwind: "$bookDetails.category" }, // Unwind category array since a book has multiple categories
                        {
                            $group: {
                                _id: "$bookDetails.category", // Group by the category ObjectId
                                borrowCount: { $sum: 1 }
                            }
                        },
                        {
                            $lookup: {
                                from: "categories", // Join to resolve ObjectId into a text string title
                                localField: "_id",
                                foreignField: "_id",
                                as: "categoryDetails"
                            }
                        },
                        { $unwind: "$categoryDetails" },
                        {
                            $project: {
                                _id: 0,
                                categoryName: "$categoryDetails.title",
                                borrowCount: 1
                            }
                        },
                        { $sort: { borrowCount: -1 } }
                    ]
                }
            }
        ]),
        Book.countDocuments({ copies_available: 0 })
    ]);

    // Extract variables out of the $facet array result securely safely matching defaults
    const facetResult = advancedMetrics[0] || {};
    const loanStats = facetResult.loanStatuses?.[0] || { activeBorrows: 0, overdueBorrows: 0 };
    const topBorrowers = facetResult.topBorrowers || [];
    const categoryPopularity = facetResult.categoryPopularity || [];
    const outOfStockBooks = advancedMetrics[3] || 0;

    res.status(200).json({
        summaryCards: {
            totalBooks,
            totalUsers,
            activeLoans: loanStats.activeBorrows,
            overdueLoans: loanStats.overdueBorrows,
            outOfStockAlerts: outOfStockBooks
        },
        charts: {
            genreDistribution: categoryPopularity,
        },
        leaderboards: {
            powerUsers: topBorrowers
        }
    });
});