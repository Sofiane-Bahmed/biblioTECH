import mongoose from "mongoose";

const Schema = mongoose.Schema

const commentSchema = new Schema({

    user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },

    book: {
        type: Schema.Types.ObjectId,
        ref: 'book',
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    parentComment: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now
    },
    replies: [{
        type: String,
    }],
});


export const Comment = mongoose.model("comment", commentSchema)
