import mongoose from "mongoose"

const Schema = mongoose.Schema

const categorySchema = new Schema(
    {
       title : {
        type : String,
        required : true,
        unique : true
       }
    }
)

export const Category = mongoose.model("category",categorySchema)

