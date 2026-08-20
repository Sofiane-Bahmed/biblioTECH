import request from "supertest";
import express from "express";
import { jest } from "@jest/globals";

// 1. Mocking Dependencies using ES module mockers
jest.unstable_mockModule("../../models/category.js", () => ({
  Category: {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/book.js", () => ({
  Book: {
    exists: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/paginate.js", () => ({
  getPaginatedData: jest.fn(),
}));

// Mocking the validation middleware to automatically call next()
jest.unstable_mockModule("../../middlewares/validate.js", () => ({
  validate: () => (req: any, res: any, next: any) => next(),
}));

// 2. Dynamic imports after module mocks executed
const { adminCategoryRouter } = await import(
  "../../routers/admin/category.js"
);
const { Category } = await import("../../models/category.js");
const { Book } = await import("../../models/book.js");
const { getPaginatedData } = await import("../../utils/paginate.js");

// Setup express test instance
const app = express();
app.use(express.json());

// Set up auth mock middleware
app.use((req: any, res: any, next: any) => {
  req.user = { id: "mock-user-id", role: "admin" };
  next();
});

// Mount router under the assumed path
app.use("/api/admin/categories", adminCategoryRouter);

jest.setTimeout(15000);

describe("Admin Category API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCategory = {
    _id: "60c72b2f9b1d8b2bad6832e1",
    title: "Science Fiction",
    description: "Futuristic and technological themes",
  };

  // POST /api/admin/categories (Add Category)
  describe("POST /api/admin/categories", () => {
    it("should successfully create a category and return 201", async () => {
      jest.mocked(Category.findOne).mockResolvedValue(null as never);
      jest.mocked(Category.create).mockResolvedValue(mockCategory as never);

      const res = await request(app).post("/api/admin/categories").send({
        title: "Science Fiction",
        description: "Futuristic and technological themes",
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        status: true,
        code: 201,
        message: "Category added successfully.",
        data: { category: mockCategory },
      });
      expect(Category.create).toHaveBeenCalledWith({
        title: "Science Fiction",
        description: "Futuristic and technological themes",
      });
    });

    it("should return 409 if category with same title exists", async () => {
      jest.mocked(Category.findOne).mockResolvedValue(mockCategory as never);

      const res = await request(app).post("/api/admin/categories").send({
        title: "Science Fiction",
        description: "Futuristic and technological themes",
      });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        status: false,
        code: 409,
        message: "A category with this title already exists.",
      });
    });
  });

  // GET /api/admin/categories
  describe("GET /api/admin/categories", () => {
    it("should return a list of paginated categories with 200", async () => {
      const mockPaginatedResult = {
        data: [mockCategory],
        total: 1,
        page: 1,
        pages: 1,
      };
      jest
        .mocked(getPaginatedData)
        .mockResolvedValue(mockPaginatedResult as any);

      const res = await request(app).get("/api/admin/categories");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        code: 200,
        message: "Categories retrieved successfully.",
        data: mockPaginatedResult,
      });
      expect(getPaginatedData).toHaveBeenCalled();
    });

    it("should return 200 with empty array when no categories are returned by the paginator", async () => {
      const emptyPaginatedResult = {
        data: [],
        total: 0,
        page: 1,
        pages: 0,
      };
      jest
        .mocked(getPaginatedData)
        .mockResolvedValue(emptyPaginatedResult as any);

      const res = await request(app).get("/api/admin/categories");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        code: 200,
        message: "No categories found.",
        data: emptyPaginatedResult,
      });
    });
  });

  // GET /api/admin/categories/:categoryId
  describe("GET /api/admin/categories/:categoryId", () => {
    it("should return the requested category with 200", async () => {
      jest.mocked(Category.findById).mockResolvedValue(mockCategory as any);

      const res = await request(app).get(
        `/api/admin/categories/${mockCategory._id}`
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        code: 200,
        message: "Category details retrieved successfully.",
        data: { category: mockCategory },
      });
      expect(Category.findById).toHaveBeenCalledWith(mockCategory._id);
    });

    it("should return 404 if category is not found", async () => {
      jest.mocked(Category.findById).mockResolvedValue(null as any);

      const res = await request(app).get(
        `/api/admin/categories/${mockCategory._id}`
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: false,
        code: 404,
        message: "Category not found.",
      });
    });
  });

  // PATCH /api/admin/categories/:categoryId (Update Category)
  describe("PATCH /api/admin/categories/:categoryId", () => {
    const updatePayload = { title: "Sci-Fi" };
    const updatedCategory = { ...mockCategory, title: "Sci-Fi" };

    it("should successfully update a category and return 200", async () => {
      jest.mocked(Category.findOne).mockResolvedValue(null as any);
      jest
        .mocked(Category.findByIdAndUpdate)
        .mockResolvedValue(updatedCategory as any);

      const res = await request(app)
        .patch(`/api/admin/categories/${mockCategory._id}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        code: 200,
        message: "Category updated successfully.",
        data: { category: updatedCategory },
      });
      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
        mockCategory._id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );
    });

    it("should return 404 if the category to update is not found", async () => {
      jest.mocked(Category.findOne).mockResolvedValue(null as any);
      jest.mocked(Category.findByIdAndUpdate).mockResolvedValue(null as any);

      const res = await request(app)
        .patch(`/api/admin/categories/${mockCategory._id}`)
        .send(updatePayload);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: false,
        code: 404,
        message: "Category not found.",
      });
    });
  });

  // DELETE /api/admin/categories/:categoryId
  describe("DELETE /api/admin/categories/:categoryId", () => {
    it("should successfully delete the category and return 200", async () => {
      jest.mocked(Category.findById).mockResolvedValue(mockCategory as any);
      jest.mocked(Book.exists).mockResolvedValue(null as any);
      jest
        .mocked(Category.findByIdAndDelete)
        .mockResolvedValue(mockCategory as any);

      const res = await request(app).delete(
        `/api/admin/categories/${mockCategory._id}`
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        status: true,
        code: 200,
        message: "Category deleted successfully.",
      });
      expect(Category.findByIdAndDelete).toHaveBeenCalledWith(mockCategory._id);
    });

    it("should return 400 if books are associated with category", async () => {
      jest.mocked(Category.findById).mockResolvedValue(mockCategory as any);
      jest.mocked(Book.exists).mockResolvedValue({ _id: "book-id" } as any);

      const res = await request(app).delete(
        `/api/admin/categories/${mockCategory._id}`
      );

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        status: false,
        code: 400,
        message: "Cannot delete category while books are assigned to it.",
      });
    });

    it("should return 404 if the category to delete is not found", async () => {
      jest.mocked(Category.findById).mockResolvedValue(null as any);

      const res = await request(app).delete(
        `/api/admin/categories/${mockCategory._id}`
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        status: false,
        code: 404,
        message: "Category not found.",
      });
    });
  });
});