import mongoose from "mongoose"

const Schema = mongoose.Schema

const borrowBookSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user"
    },
    book: {
      type: Schema.Types.ObjectId,
      ref: "book"
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REJECTED', 'RETURNED',"CANCELED"],
      default: 'PENDING'
    },
    request_date: {
      type: Date,
      default: Date.now
    },
    borrow_date: {
      type: Date,
    },
    due_date: {
      type: Date,
    },
    return_date: {
      type: Date,
    },
    renewed: {
      type: Boolean,
      default: false
    },
  }, { timestamps: true }
);

export const BorrowBook = mongoose.model("borrowBook", borrowBookSchema)
