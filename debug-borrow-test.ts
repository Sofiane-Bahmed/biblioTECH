import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { User } from "./models/user.js";
import { Book } from "./models/book.js";
import { Borrow } from "./models/borrow.js";
import { librarianBorrowRouter } from "./routers/librarian/borrow.js";

async function debug() {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const app = express();
    app.use(express.json());

    const staffId = new mongoose.Types.ObjectId();
    app.use((req: any, _res, next) => {
        req.user = { _id: staffId.toString(), role: "librarian" };
        next();
    });

    app.use("/api/librarian/borrows", librarianBorrowRouter);

    // Seed data
    const userId = new mongoose.Types.ObjectId();
    await User.create({
        _id: userId,
        fullName: "John Doe",
        email: "john@example.com",
        role: "user",
        password: "Password123!",
        subscribed: false,
        outstanding_fines: 50.0,
    });

    const bookId = new mongoose.Types.ObjectId();
    await Book.create({
        _id: bookId,
        title: "Clean Code",
        author: ["Robert C. Martin"],
        description: "A handbook of agile software craftsmanship",
        copies_available: 5,
        pages: 464,
        language: "English",
        publication_year: 2008,
        cover_image: "https://example.com/clean-code.jpg",
        isbn: "978-0132350884",
        category: [],
    });

    const borrowId = new mongoose.Types.ObjectId();
    await Borrow.create({
        _id: borrowId,
        user: userId,
        book: bookId,
        status: "PENDING",
    });

    // Test approve endpoint
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`http://localhost:3000/api/librarian/borrows/${borrowId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_message: "Ready for pickup" })
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    await mongoose.disconnect();
    await mongoServer.stop();
}

debug().catch(console.error);
