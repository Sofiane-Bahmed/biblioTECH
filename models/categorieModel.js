import mongoose from "mongoose"

const Schema = mongoose.Schema

const categorieSchema = new Schema(
    {
       titre : {
        type : String,
        required : true,
        unique : true
       }
    }
)

export const Categorie = mongoose.model("categorie",categorieSchema)

