import mongoose, {
    Schema,
    Document,
    Model,
    Types
} from "mongoose";

export interface IBook {
    _id: Types.ObjectId;
    category: Types.ObjectId[];
    title: string;
    author: string[];
    description: string;
    copies_available: number;
    pages: number;
    language: string;
    publication_year: number;
    cover_image: string;
    isbn: string;
    borrows?: Types.ObjectId[];
    comments?: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

export type BookDocument = IBook & Document;

const bookSchema = new Schema<IBook>(
    {
        category: [{
            type: Schema.Types.ObjectId,
            ref: "category",
            required: true,
        }],
        title: {
            type: String,
            required: true,
            unique: true
        },
        author: [{
            type: String,
            required: true,
        }],
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
        isbn: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        borrows: [{
            type: Schema.Types.ObjectId,
            ref: "Borrow"
        }],
        comments: [{
            type: Schema.Types.ObjectId,
            ref: "comment"
        }]
    },
    {
        timestamps: true
    }
);

bookSchema.index({
    title: "text",
    author: "text"
});

export const Book: Model<IBook> = mongoose.model<IBook>("book", bookSchema);