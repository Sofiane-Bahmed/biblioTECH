import mongoose from "mongoose";

import asyncHandler from "../utils/asyncHandler.js"

const connectDB = asyncHandler(async () => {

  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(process.env.DBURI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);

});

export default connectDB;