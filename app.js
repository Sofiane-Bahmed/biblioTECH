import express from "express"
import mongoose from "mongoose"
import * as  dotenv from "dotenv"

import { bookRouter } from "./routers/book.js"
import { borrowBookRouter } from "./routers/borrowBook.js"
import { categoryRouter } from "./routers/category.js"
import { commentRouter } from "./routers/comment.js"
import { authRouter } from "./routers/auth.js"
import { userRouter } from "./routers/user.js"

const app = express()
app.use(express.json())
dotenv.config();

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





