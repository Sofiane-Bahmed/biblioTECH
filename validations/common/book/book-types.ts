import z from "zod";
import {
    getBookSchema,
    getBooksSchema,
    searchBookSchema
} from "./book-schema.js";

export type GetBooksRequest = z.infer<typeof getBooksSchema>;
export type GetBooksQuery = NonNullable<GetBooksRequest["query"]>;

export type GetBookRequest = z.infer<typeof getBookSchema>;
export type GetBookParams = GetBookRequest["params"];

export type SearchBookRequest = z.infer<typeof searchBookSchema>;
export type SearchBookQuery = NonNullable<SearchBookRequest["query"]>;