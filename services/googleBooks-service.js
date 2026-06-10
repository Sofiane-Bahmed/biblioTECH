import axios from "axios";

export const fetchBookMetadataByIsbn = async (isbn) => {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;

    const { data } = await axios.get(url);

    if (!data.items || data.items.length === 0) return null;

    const volumeInfo = data.items[0].volumeInfo;

    return {
        title: volumeInfo.title || "Untitled Book",
        authors: volumeInfo.authors || ["Unknown Author"],
        description: volumeInfo.description || "No description provided.",
        pages: volumeInfo.pageCount || 0,
        language: volumeInfo.language || "en",
        publicationYear: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.split("-")[0]) : new Date().getFullYear(),
        coverImageUrl: volumeInfo.imageLinks?.thumbnail || "https://placehold.co/400x600?text=No+Cover+Available",
        categories: volumeInfo.categories || ["General"],
    };
};