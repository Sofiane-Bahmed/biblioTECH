import express from "express"
import { rateLimit } from 'express-rate-limit'
import helmet from "helmet";
import mongoose from "mongoose"
import * as  dotenv from "dotenv"
import cookieParser from "cookie-parser";

import router from "./routers/index.js"

const app = express()
dotenv.config();

app.use(helmet());
app.use(express.json())
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Apply the rate limiting middleware to all requests.
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8',
	legacyHeaders: false, 
	ipv6Subnet: 56,

})
app.use(limiter)

// Database connection and server start
const dburi = process.env.DBURI
const port = process.env.PORT

mongoose.set("strictQuery", true)
mongoose
  .connect(dburi)
  .then(() => {
    app.listen(port, () => {
      console.log(`this app is running in port http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

// Routes
app.use("/api", router)





