import { Types } from "mongoose";
import { faker } from "@faker-js/faker";
import { Book } from "./models/book.js";
import { Category } from "./models/category.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

const SEED_COUNT = 25;

interface DummyBookInput {
    title: string;
    author: string[];
    isbn: string;
    description: string;
    copies_available: number;
    pages: number;
    language: string;
    publication_year: number;
    category: Types.ObjectId[];
    cover_image: string;
}

const seedDatabase = async (): Promise<void> => {
    try {
        console.log("Connecting to database...");
        await connectDB();

        const existingCategories = await Category.find({});

        if (existingCategories.length === 0) {
            console.error("❌ Seeding aborted: No categories found in the database. Please seed or add categories first!");
            process.exit(1);
        }

        const categoryIdsList = existingCategories.map(cat => cat._id as Types.ObjectId);

        console.log("Connected! Dropping old books collection...");
        await Book.deleteMany({});

        console.log(`Generating ${SEED_COUNT} random books with valid database references...`);
        const dummyBooks: DummyBookInput[] = [];

        for (let i = 0; i < SEED_COUNT; i++) {
            const rawIsbn = faker.commerce.isbn();
            const normalizedIsbn = rawIsbn.replace(/[- ]/g, "").toUpperCase();
            const coverImageUrl = `https://loremflickr.com/400/600/abstract,book/all?lock=${i}`;

            const assignedCategories = faker.helpers.arrayElements(categoryIdsList, { min: 1, max: 2 });

            const authorName = faker.book.author();

            const uniqueTitle = `${faker.book.title()} #${i + 1}`;

            dummyBooks.push({
                title: uniqueTitle,
                author: [authorName],
                isbn: normalizedIsbn,
                description: faker.lorem.paragraph(),
                copies_available: faker.number.int({ min: 1, max: 8 }),
                pages: faker.number.int({ min: 120, max: 800 }),
                language: faker.helpers.arrayElement(["English", "French", "German"]),
                publication_year: faker.number.int({ min: 1995, max: 2026 }),
                category: assignedCategories,
                cover_image: coverImageUrl,
            });
        }

        await Book.insertMany(dummyBooks);
        console.log(`🚀 Success! Saved ${SEED_COUNT} books with valid category IDs to the database.`);

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Seeding failed:", error.message || error);
        process.exit(1);
    }
};

seedDatabase();