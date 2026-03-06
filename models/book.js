import mongoose from "mongoose";

const Schema = mongoose.Schema

const bookSchema = new Schema(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: "categorie"
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

const commentSchema = new Schema({

    user: {
        type: String,
        ref: 'user',
        required: true
    },

    book: {
        type: String,
        ref: 'book',
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'comment'
    },
    date: {
        type: Date,
        default: Date.now
    },
    replies: [{
        type: String,
        ref: 'comment'
    }],
})

export const Book = mongoose.model("book", bookSchema)
export const Comment = mongoose.model("comment", commentSchema)



