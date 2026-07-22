import app from "./app.js";
import connectDB from "./db/index.js";
import { startBorrowExpirationJob } from "./jobs/borrow-expiration.job.js";

const port: string | number = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`🚀 Production server executing smoothly on http://localhost:${port}`);
    });

    startBorrowExpirationJob();
    console.log("⏰ Background cron jobs initialized.");
    
  } catch (error: any) {
    console.error("❌ Failed to initialize application sequence container:", error.message || error);
    process.exit(1);
  }
};

startServer();