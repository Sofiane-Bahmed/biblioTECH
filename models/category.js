import mongoose from "mongoose"

const Schema = mongoose.Schema

const categorySchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true,
            maxLength: 100,
            minLength: 3
        },
        description: {
            type: String,
            required: true,
            maxLength: 500,
            minLength: 10
        }
    }
)

export const Category = mongoose.model("category", categorySchema)

