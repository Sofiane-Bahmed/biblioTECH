import * as dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import router from "./routers/index.js";
import { errorMiddleware } from "./middlewares/error.js";

const app: Application = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100,
	standardHeaders: "draft-8",
	legacyHeaders: false, // Disables archaic X-RateLimit-* headers safely
	ipv6Subnet: 56, // Optimized subnet wrapping mask for contemporary enterprise IP topologies
});
app.use(limiter);

app.use("/api", router);

app.use(errorMiddleware);

export default app;