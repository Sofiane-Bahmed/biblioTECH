import { Book } from "../../models/book.js";
import { User } from "../../models/user.js";
import { Borrow } from "../../models/borrow.js";

interface ILoanStatusMetric {
  activeBorrows: number;
  overdueBorrows: number;
}

interface ITopBorrowerMetric {
  userId: string;
  borrowCount: number;
  name: string;
  email: string;
}

interface ICategoryPopularityMetric {
  categoryName: string;
  borrowCount: number;
}

interface ILibraryFacetResult {
  loanStatuses: ILoanStatusMetric[];
  topBorrowers: ITopBorrowerMetric[];
  categoryPopularity: ICategoryPopularityMetric[];
}

export const getLibraryStatisticsService = async () => {
  const [totalBooks, totalUsers, advancedMetrics, outOfStockBooks] = await Promise.all([
    Book.countDocuments(),
    User.countDocuments({ subscribed: true }),

    Borrow.aggregate<ILibraryFacetResult>([
      {
        $facet: {
          loanStatuses: [
            {
              $group: {
                _id: null,
                activeBorrows: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "ACTIVE"] },
                          {
                            $or: [
                              { $eq: [{ $type: "$return_date" }, "missing"] },
                              { $eq: ["$return_date", null] },
                            ],
                          },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                overdueBorrows: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$status", "ACTIVE"] },
                          {
                            $or: [
                              { $eq: [{ $type: "$return_date" }, "missing"] },
                              { $eq: ["$return_date", null] },
                            ],
                          },
                          { $lt: ["$due_date", new Date()] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          topBorrowers: [
            { $match: { status: { $in: ["ACTIVE", "RETURNED"] } } },
            { $group: { _id: "$user", borrowCount: { $sum: 1 } } },
            { $sort: { borrowCount: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userDetails",
              },
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                userId: "$_id",
                borrowCount: 1,
                name: "$userDetails.fullName",
                email: "$userDetails.email",
              },
            },
          ],
          categoryPopularity: [
            { $match: { status: { $in: ["ACTIVE", "RETURNED"] } } },
            {
              $lookup: {
                from: "books",
                localField: "book",
                foreignField: "_id",
                as: "bookDetails",
              },
            },
            { $unwind: "$bookDetails" },
            { $unwind: "$bookDetails.category" },
            {
              $group: {
                _id: "$bookDetails.category",
                borrowCount: { $sum: 1 },
              },
            },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails",
              },
            },
            { $unwind: "$categoryDetails" },
            {
              $project: {
                _id: 0,
                categoryName: "$categoryDetails.title",
                borrowCount: 1,
              },
            },
            { $sort: { borrowCount: -1 } },
          ],
        },
      },
    ]),
    Book.countDocuments({ copies_available: 0 }),
  ]);

  const facetResult: Partial<ILibraryFacetResult> = advancedMetrics[0] || {};

  const loanStats: ILoanStatusMetric = facetResult.loanStatuses?.[0] || {
    activeBorrows: 0,
    overdueBorrows: 0,
  };
  const topBorrowers: ITopBorrowerMetric[] = facetResult.topBorrowers || [];
  const categoryPopularity: ICategoryPopularityMetric[] =
    facetResult.categoryPopularity || [];

  return {
    status: true,
    code: 200,
    message: "Library statistics calculated successfully.",
    data: {
      summaryCards: {
        totalBooks,
        totalUsers,
        activeLoans: loanStats.activeBorrows,
        overdueLoans: loanStats.overdueBorrows,
        outOfStockAlerts: outOfStockBooks,
      },
      charts: {
        genreDistribution: categoryPopularity,
      },
      leaderboards: {
        powerUsers: topBorrowers,
      },
    },
  };
};