import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_test_jwt_secret";

export const generateTestToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
};