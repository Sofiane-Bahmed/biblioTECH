import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true);

    const dbUri = process.env.DBURI;
    if (!dbUri) {
      throw new Error("Missing DBURI inside your environment configuration variables.");
    }

    const conn = await mongoose.connect(dbUri);
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ Database Connection Failure: ${error.message || error}`);
    process.exit(1);
  }
};

export default connectDB;