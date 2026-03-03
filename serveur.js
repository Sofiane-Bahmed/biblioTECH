import express from "express"
import mongoose from "mongoose"
import * as  dotenv from "dotenv"

import { userRouter } from "./routers/user.js"
import { bookRouter } from "./routers/book.js"
import { borrowBookRouter } from "./routers/borrowBook.js"
import { categorieRouter } from "./routers/category.js"

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
app.use("/books", bookRouter)
app.use("/borrowBooks", borrowBookRouter)
app.use("/categories", categorieRouter)





