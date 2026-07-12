import mongoose, {
    Schema,
    Document,
    Model
} from "mongoose";

export interface ICategory {
    title: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type CategoryDocument = ICategory & Document;

const categorySchema = new Schema<ICategory>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        }
    },
    {
        timestamps: true
    }
);

export const Category: Model<ICategory> = mongoose.model<ICategory>("category", categorySchema);