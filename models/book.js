import mongoose from "mongoose";

const Schema = mongoose.Schema

const bookSchema = new Schema(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: "category",
            required: true
        },

        title: {
            type: String,
            required: true
        },
        author: {
            type: String,
            required: true
        },
        copies_available: {
            type: Number,
            required: true
        },
        borrows: [{
            type: Schema.Types.ObjectId,
            ref: 'borrowBook'
        }],

        comment: [{
            type: Schema.Types.ObjectId,
            ref: 'comment'
        }]

    }
)

export const Book = mongoose.model("book", bookSchema)



