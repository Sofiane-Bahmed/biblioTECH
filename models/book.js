import mongoose from "mongoose";

const Schema = mongoose.Schema

const bookSchema = new Schema(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: "category",
            required: true,
        },

        title: {
            type: String,
            required: true,
            unique: true
        },
        author: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        copies_available: {
            type: Number,
            required: true,
        },
        pages: {
            type: Number,
            required: true,
        },
        language: {
            type: String,
            required: true,
        },
        publication_year: {
            type: Number,
            required: true,
        },
        cover_image: {
            type: String,
            required: true,
        },
        borrows: [{
            type: Schema.Types.ObjectId,
            ref: 'borrowBook'
        }],
        comments: [{
            type: Schema.Types.ObjectId,
            ref: 'comment'
        }]

    }
)

export const Book = mongoose.model("book", bookSchema)



