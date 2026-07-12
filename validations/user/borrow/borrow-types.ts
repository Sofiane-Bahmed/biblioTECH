import z from "zod";
import {
    borrowSchema,
    cancelBorrowRequestSchema,
    renewBorrowSchema,
    requestBorrowSchema,
    returnBookSchema
} from "./borrow-schema.js";

export type BorrowRequest = z.infer<typeof borrowSchema>;
export type BorrowParams = BorrowRequest["params"];

export type RequestBorrowRequest = z.infer<typeof requestBorrowSchema>;
export type RequestBorrowParams = RequestBorrowRequest["params"];

export type CancelBorrowRequest = z.infer<typeof cancelBorrowRequestSchema>;
export type CancelBorrowParams = CancelBorrowRequest["params"];

export type ReturnBookRequest = z.infer<typeof returnBookSchema>;
export type ReturnBookParams = ReturnBookRequest["params"];

export type RenewBorrowRequest = z.infer<typeof renewBorrowSchema>;
export type RenewBorrowParams = RenewBorrowRequest["params"];