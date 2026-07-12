import mongoose, {
    Schema,
    Document,
    Model,
    Types
} from "mongoose";

export interface IComment {
    user: Types.ObjectId;
    book: Types.ObjectId;
    comment: string;
    parentComment: Types.ObjectId | null;
    date: Date;
    isDeleted: boolean;
    replies: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

export type CommentDocument = IComment & Document;

const commentSchema = new Schema<IComment>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "user",
            required: true
        },
        book: {
            type: Schema.Types.ObjectId,
            ref: "book",
            required: true
        },
        comment: {
            type: String,
            required: true,
            trim: true
        },
        parentComment: {
            type: Schema.Types.ObjectId,
            ref: "comment",
            default: null
        },
        date: {
            type: Date,
            default: Date.now,
            required: true
        },
        isDeleted: {
            type: Boolean,
            default: false,
            required: true
        },
        replies: [{
            type: Schema.Types.ObjectId,
            ref: "comment"
        }],
    },
    {
        timestamps: true
    }
);

export const Comment: Model<IComment> = mongoose.model<IComment>("comment", commentSchema);