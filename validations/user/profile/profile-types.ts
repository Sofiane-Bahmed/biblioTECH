import z from "zod";
import {
    getMyBorrowsQuerySchema,
    updateMyProfileSchema
} from "./profile-schema.js";

export type UpdateMyProfileRequest = z.infer<typeof updateMyProfileSchema>;
export type UpdateMyProfileBody = UpdateMyProfileRequest["body"];

export type GetMyBorrowsQueryRequest = z.infer<typeof getMyBorrowsQuerySchema>;
export type GetMyBorrowsQuery =  GetMyBorrowsQueryRequest["query"];