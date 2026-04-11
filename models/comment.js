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
        required: true,
        trim: true
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'comment',
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    },
    replies: [{
        type: Schema.Types.ObjectId,
        ref: 'comment'
    }],
}, { timestamps: true }
);

export const Comment = mongoose.model("comment", commentSchema)
