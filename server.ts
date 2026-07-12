import app from "./app.js";
import connectDB from "./db/index.js";

const port: string | number = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`🚀 Production server executing smoothly on http://localhost:${port}`);
    });
  } catch (error: any) {
    console.error("❌ Failed to initialize application sequence container:", error.message || error);
    process.exit(1);
  }
};

startServer();