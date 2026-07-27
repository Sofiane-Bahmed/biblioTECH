import z from "zod";
import {
    addBookSchema,
    autoImportBookSchema,
    deleteBookSchema,
    updateBookSchema
} from "./book-schema.js";

export type AddBookRequest = z.infer<typeof addBookSchema>;
export type AddBookBody = AddBookRequest["body"];

export type AutoImportBookRequest = z.infer<typeof autoImportBookSchema>;
export type AutoImportBookBody = AutoImportBookRequest["body"];

export type UpdateBookRequest = z.infer<typeof updateBookSchema>;
export type UpdateBookParams = UpdateBookRequest["params"];
export type UpdateBookBody = UpdateBookRequest["body"];

export type DeleteBookRequest = z.infer<typeof deleteBookSchema>;
export type DeleteBookParams = DeleteBookRequest["params"];