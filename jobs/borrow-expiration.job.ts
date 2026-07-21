import cron from "node-cron";
import mongoose from "mongoose";
import { Borrow } from "../models/borrow.js";
import { Book } from "../models/book.js";

export const startBorrowExpirationJob = (): void => {
    // Schedule to run every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        console.log("⏰ [Cron Job] Running expired borrows check...");

        const now = new Date();

        try {
            // Find all approved borrow requests whose pickup window has passed
            const expiredBorrows = await Borrow.find({
                status: "APPROVED",
                pickup_deadline: { $lt: now }
            });

            if (expiredBorrows.length === 0) {
                return;
            }

            console.log(`⏰ [Cron Job] Found ${expiredBorrows.length} expired borrow holds. Processing...`);

            for (const borrow of expiredBorrows) {
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    // 1. Mark status as EXPIRED
                    await Borrow.findByIdAndUpdate(
                        borrow._id,
                        { $set: { status: "EXPIRED" } },
                        { session }
                    );

                    // 2. Restock physical inventory safely
                    await Book.findByIdAndUpdate(
                        borrow.book,
                        { $inc: { copies_available: 1 } },
                        { session }
                    );

                    await session.commitTransaction();
                    session.endSession();

                    console.log(`✅ [Cron Job] Expired borrow #${borrow._id} and restored stock.`);
                } catch (error) {
                    await session.abortTransaction();
                    session.endSession();
                    console.error(`❌ [Cron Job] Failed to expire borrow #${borrow._id}:`, error);
                }
            }
        } catch (error) {
            console.error("❌ [Cron Job] Error fetching expired borrows:", error);
        }
    });
};