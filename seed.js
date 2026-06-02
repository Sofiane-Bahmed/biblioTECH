import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { Book } from "./models/book.js";
import { Category } from "./models/category.js"; // Make sure to import your Category model!
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

const SEED_COUNT = 25;

const seedDatabase = async () => {
    try {
        // 1. Connect to your database
        console.log("Connecting to database...");
        await connectDB();

        // 2. Fetch the real categories already existing in your database
        const existingCategories = await Category.find({});

        if (existingCategories.length === 0) {
            console.error("❌ Seeding aborted: No categories found in the database. Please seed or add categories first!");
            process.exit(1);
        }

        // Extract just the actual database document ObjectIds
        const categoryIdsList = existingCategories.map(cat => cat._id);

        console.log("Connected! Dropping old books collection...");
        // 3. Wipe the existing book collection clean
        await Book.deleteMany({});

        console.log(`Generating ${SEED_COUNT} random books with valid database references...`);
        const dummyBooks = [];

        for (let i = 0; i < SEED_COUNT; i++) {
            const rawIsbn = faker.commerce.isbn();
            const normalizedIsbn = rawIsbn.replace(/[- ]/g, "").toUpperCase();
            const coverImageUrl = `https://loremflickr.com/400/600/abstract,book/all?lock=${i}`;

            // Correctly assign 1 to 2 real, existing database ObjectIds from your array
            const assignedCategories = faker.helpers.arrayElements(categoryIdsList, { min: 1, max: 2 });

            // Generate a single author name or array matching your authorNames controller format
            const authorName = faker.book.author();

            dummyBooks.push({
                title: faker.book.title(),
                author: [authorName],
                isbn: normalizedIsbn,
                description: faker.lorem.paragraph(),
                copies_available: faker.number.int({ min: 1, max: 8 }),
                pages: faker.number.int({ min: 120, max: 800 }),
                language: faker.helpers.arrayElement(["English", "French", "German"]),
                publication_year: faker.number.int({ min: 1995, max: 2026 }),
                category: assignedCategories, // Passing true ObjectIds passes Mongoose cast limits perfectly!
                cover_image: coverImageUrl,
            });
        }

        // 4. Batch insert everything into MongoDB
        await Book.insertMany(dummyBooks);
        console.log(`🚀 Success! Saved ${SEED_COUNT} books with valid category IDs to the database.`);

        // 5. Safely exit
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
};

seedDatabase();