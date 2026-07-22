import mongoose,
{
    Schema,
    Document,
    Model,
    Types
} from "mongoose";

export type ReservationStatus = "PENDING" | "READY_FOR_PICKUP" | "FULFILLED" | "EXPIRED" | "CANCELED";

export interface IReservation {
    user: Types.ObjectId;
    book: Types.ObjectId;
    status: ReservationStatus;
    expires_at?: Date; 
    createdAt?: Date;
    updatedAt?: Date;
}

export type ReservationDocument = IReservation & Document;

const reservationSchema = new Schema<IReservation>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        book: {
            type: Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        },
        status: {
            type: String,
            enum: ["PENDING", "READY_FOR_PICKUP", "FULFILLED", "EXPIRED", "CANCELED"],
            default: "PENDING",
            required: true,
        },
        expires_at: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// INDEX 1: Fast FIFO Queue Lookups
// Speeds up finding the next inline user when a book is returned (sorted by createdAt)
reservationSchema.index({ book: 1, status: 1, createdAt: 1 });

// INDEX 2: Prevent Duplicate Pending Queue Holds
// Ensures a user cannot join the waiting list twice for the same book at the same time
reservationSchema.index(
    { user: 1, book: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "PENDING" },
    }
);

// INDEX 3: Prevent Duplicate Pickup Ready Holds
reservationSchema.index(
    { user: 1, book: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "READY_FOR_PICKUP" },
    }
);

export const Reservation: Model<IReservation> = mongoose.model<IReservation>("Reservation", reservationSchema);