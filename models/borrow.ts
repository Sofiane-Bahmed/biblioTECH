import mongoose, {
  Schema,
  Document,
  Model,
  Types
} from "mongoose";

export type BorrowStatus = "PENDING" | "APPROVED" | "ACTIVE" | "REJECTED" | "RETURNED" | "CANCELED" | "EXPIRED";
export type BookCondition = "GOOD" | "DAMAGED" | "RUINED";

export interface IBorrow {
  user: Types.ObjectId;
  book: Types.ObjectId;
  status: BorrowStatus;
  rejected_message?: string;
  approved_message?: string;
  canceled_message?: string;
  request_date: Date;
  borrow_date?: Date;
  due_date?: Date;
  return_date?: Date;
  condition_on_return: BookCondition;
  pickup_deadline?: Date;
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
    },
    approved_message: {
      type: String,
    },
    canceled_message: {
      type: String,
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
    condition_on_return: {
      type: String,
      enum: ["GOOD", "DAMAGED", "RUINED"],
      default: "GOOD",
      required: true
    },
    pickup_deadline: {
      type: Date
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

// Prevents a user from having two PENDING or ACTIVE requests for the same book at the database level
// 1. Enforce max 1 PENDING request per (user, book)
borrowSchema.index(
  { user: 1, book: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" }
  }
);

// 2. Enforce max 1 ACTIVE borrow per (user, book)
borrowSchema.index(
  { user: 1, book: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" }
  }
);

export const Borrow: Model<IBorrow> = mongoose.model<IBorrow>("borrow", borrowSchema);