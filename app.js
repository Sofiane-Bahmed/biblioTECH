import express from "express"
import { rateLimit } from 'express-rate-limit'
import mongoose from "mongoose"
import * as  dotenv from "dotenv"
import cookieParser from "cookie-parser";

import { bookRouter } from "./routers/book.js"
import { borrowBookRouter } from "./routers/borrowBook.js"
import { categoryRouter } from "./routers/category.js"
import { commentRouter } from "./routers/comment.js"
import { authRouter } from "./routers/auth.js"
import { userRouter } from "./routers/user.js"

const app = express()
app.use(express.json())
app.use(cookieParser());
dotenv.config();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8',
	legacyHeaders: false, 
	ipv6Subnet: 56,

})

// Apply the rate limiting middleware to all requests.
app.use(limiter)

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

app.use(express.urlencoded({ extended: true }));


app.use("/users", userRouter)
app.use("/auth", authRouter)
app.use("/books", bookRouter)
app.use("/borrows", borrowBookRouter)
app.use("/categories", categoryRouter)
app.use("/comments", commentRouter)





