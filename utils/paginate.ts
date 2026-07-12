import { Request } from "express";
import {
    Model,
    PopulateOptions,
    SortOrder
} from "mongoose";

interface PaginatedDataOptions<T> {
    model: Model<T>;
    query?: Record<string, any>;
    req: Request;
    populate?: string | string[] | PopulateOptions | PopulateOptions[];
    sort?: Record<string, SortOrder>;
}

interface PaginatedResult<T> {
    success: boolean;
    count: number;
    totalPages: number;
    currentPage: number;
    totalItems: number;
    data: T[];
}

export const getPaginatedData = async <T>({
    model,
    query = {},
    req,
    populate = [],
    sort = { createdAt: -1 }
}: PaginatedDataOptions<T>): Promise<PaginatedResult<T>> => {

    const page = typeof req.query.page === "number"
        ? req.query.page
        : typeof req.query.page === "string"
            ? parseInt(req.query.page, 10)
            : 1;

    const limit = typeof req.query.limit === "number"
        ? req.query.limit
        : typeof req.query.limit === "string"
            ? parseInt(req.query.limit, 10)
            : 10;
            
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
        model.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate(populate as any)
            .lean<T[]>()
            .exec(),
        model.countDocuments(query).exec()
    ]);

    return {
        success: true,
        count: data.length,
        totalPages: Math.ceil(totalItems / limit) || 1,
        currentPage: page,
        totalItems,
        data: data as T[]
    };
};