import z from "zod";
import {
    borrowSchema,
    cancelBorrowRequestSchema,
    renewBorrowSchema,
    requestBorrowSchema,
} from "./borrow-schema.js";

export type BorrowRequest = z.infer<typeof borrowSchema>;
export type BorrowParams = BorrowRequest["params"];

export type RequestBorrowRequest = z.infer<typeof requestBorrowSchema>;
export type RequestBorrowParams = RequestBorrowRequest["params"];

export type CancelBorrowRequest = z.infer<typeof cancelBorrowRequestSchema>;
export type CancelBorrowParams = CancelBorrowRequest["params"];

export type RenewBorrowRequest = z.infer<typeof renewBorrowSchema>;
export type RenewBorrowParams = RenewBorrowRequest["params"];