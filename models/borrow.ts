import mongoose, {
  Schema,
  Document,
  Model,
  Types
} from "mongoose";

export type BorrowStatus = "PENDING" | "ACTIVE" | "REJECTED" | "RETURNED" | "CANCELED";

export interface IBorrow {
  user: Types.ObjectId;
  book: Types.ObjectId;
  status: BorrowStatus;
  rejected_message: string;
  approved_message: string;
  canceled_message: string;
  request_date: Date;
  borrow_date?: Date;
  due_date?: Date;
  return_date?: Date;
  renewed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BorrowDocument = IBorrow & Document;

const borrowSchema = new Schema<IBorrow>(
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
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "REJECTED", "RETURNED", "CANCELED"],
      default: "PENDING",
      required: true
    },
    rejected_message: {
      type: String,
      required: true
    },
    approved_message: {
      type: String,
    },
    canceled_message: {
      type: String,
      required: true
    },
    request_date: {
      type: Date,
      default: Date.now,
      required: true
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
      default: false,
      required: true
    },
  },
  {
    timestamps: true
  }
);

export const Borrow: Model<IBorrow> = mongoose.model<IBorrow>("borrow", borrowSchema);