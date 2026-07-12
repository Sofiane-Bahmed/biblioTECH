import axios from "axios";

interface GoogleBooksApiResponse {
    items?: Array<{
        volumeInfo: {
            title?: string;
            authors?: string[];
            description?: string;
            pageCount?: number;
            language?: string;
            publishedDate?: string;
            categories?: string[];
            imageLinks?: {
                thumbnail?: string;
            };
        };
    }>;
}

export interface NormalizedBookMetadata {
    title: string;
    authors: string[];
    description: string;
    pages: number;
    language: string;
    publicationYear: number;
    coverImageUrl: string;
    categories: string[];
}

export const fetchBookMetadataByIsbn = async (
    isbn: string
): Promise<NormalizedBookMetadata | null> => {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";

    const url = apiKey
        ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`
        : `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

    try {
        const { data } = await axios.get<GoogleBooksApiResponse>(url);

        if (!data.items || data.items.length === 0) {
            return null;
        }

        const volumeInfo = data.items[0].volumeInfo;

        return {
            title: volumeInfo.title || "Untitled Book",
            authors: volumeInfo.authors || ["Unknown Author"],
            description: volumeInfo.description || "No description provided.",
            pages: volumeInfo.pageCount || 0,
            language: volumeInfo.language || "en",
            publicationYear: volumeInfo.publishedDate
                ? parseInt(volumeInfo.publishedDate.split("-")[0], 10)
                : new Date().getFullYear(),
            coverImageUrl: volumeInfo.imageLinks?.thumbnail || "https://placehold.co/400x600?text=No+Cover+Available",
            categories: volumeInfo.categories || ["General"],
        };
    } catch (error) {
        console.error(`[Google Books Service Error]: Request failed for ISBN ${isbn}`, error);
        return null;
    }
};