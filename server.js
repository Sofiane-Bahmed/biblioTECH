import app from "./app.js";
import connectDB from "./db/index.js";

const port = process.env.PORT || 5000;

// Connect to Database and start listening to incoming network requests
const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
        console.log(`🚀 Production server executing smoothly on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to initialize application sequence container:", error);
    process.exit(1);
  }
};

startServer();