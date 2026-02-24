import express from "express"

import {
    createBookCategory,
    showBookCategorie,
    updateBookCategory,
    deleteBookCategory
} from "../cotrollers/categorie.js"


export const categorieRouter = express.Router()

categorieRouter.post("/category", createBookCategory)
categorieRouter.get("/category/:id", showBookCategorie)
categorieRouter.patch("/category/:id", updateBookCategory)
categorieRouter.delete("/category/:id", deleteBookCategory)