import {
    Request,
    Response,
    NextFunction
} from "express";
import { z } from "zod";

import asyncHandler from "../utils/async-handler.js";

export const validate = (schema: z.ZodType<any, any, any>) =>
    asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<any> => {

        const result = await schema.safeParseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (!result.success) {
            const formattedErrors = z.treeifyError(result.error);

            return res.status(400).json({
                message: "Validation Error",
                errors: formattedErrors,
            });
        }

        req.body = result.data.body;
        req.query = result.data.query;
        req.params = result.data.params;

        next();
    });