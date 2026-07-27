import z from "zod";
import {
    approveBorrowRequestSchema,
    cancelBorrowRequestSchema,
    confirmHandoverSchema,
    deleteBorrowSchema,
    getBorrowSchema,
    getBorrowsQuerySchema,
    getUserBorrowingHistorySchema,
    payFineInPersonSchema,
    rejectBorrowRequestSchema,
    returnBookSchema
} from "./borrow-schema.js";

export type ApproveBorrowRequest = z.infer<typeof approveBorrowRequestSchema>;
export type ApproveBorrowParams = ApproveBorrowRequest["params"];
export type ApproveBorrowBody = ApproveBorrowRequest["body"];

export type RejectBorrowRequest = z.infer<typeof rejectBorrowRequestSchema>;
export type RejectBorrowParams = RejectBorrowRequest["params"];
export type RejectBorrowBody = RejectBorrowRequest["body"];

export type CancelBorrowRequest = z.infer<typeof cancelBorrowRequestSchema>;
export type CancelBorrowParams = CancelBorrowRequest["params"];
export type CancelBorrowBody = CancelBorrowRequest["body"];

export type ConfirmHandoverRequest = z.infer<typeof confirmHandoverSchema>;
export type ConfirmHandoverParams = ConfirmHandoverRequest["params"];

export type ReturnBookRequest = z.infer<typeof returnBookSchema>;
export type ReturnBookParams = ReturnBookRequest["params"];
export type ReturnBookBody = ReturnBookRequest["body"];

export type PayFineInPersonRequest = z.infer<typeof payFineInPersonSchema>;
export type PayFineInPersonParams = PayFineInPersonRequest["params"];
export type PayFineInPersonBody = PayFineInPersonRequest["body"];

export type GetBorrowRequest = z.infer<typeof getBorrowSchema>;
export type GetBorrowParams = GetBorrowRequest["params"];

export type DeleteBorrowRequest = z.infer<typeof deleteBorrowSchema>;
export type DeleteBorrowParams = DeleteBorrowRequest["params"];

export type GetUserBorrowingHistoryRequest = z.infer<typeof getUserBorrowingHistorySchema>;
export type GetUserBorrowingHistoryParams = GetUserBorrowingHistoryRequest["params"];
export type GetUserBorrowingHistoryQuery = NonNullable<GetUserBorrowingHistoryRequest["query"]>;

export type GetBorrowsQueryRequest = z.infer<typeof getBorrowsQuerySchema>;
export type GetBorrowsQuery = GetBorrowsQueryRequest["query"];