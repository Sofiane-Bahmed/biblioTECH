import mongoose from "mongoose"

const Schema = mongoose.Schema

const borrowBookSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "utilisateur"
    },
    book: {
      type: Schema.Types.ObjectId,
      ref: "book"
    },
    borrow_date: {
      type: Date,
      required: true
    },
    due_date: {
      type: Date,
      required: true
    },
    return_date: {
      type: Date,
    },
    renewed: {
      type: Boolean,
      default: false
    },
  }
)

export const BorrowBook = mongoose.model("borrowBook", borrowBookSchema)
