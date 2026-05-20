import asyncHandler from "../utils/async-handler.js";

export const validate = (schema) => asyncHandler(async (req, res, next) => {
    // parseAsync handles both sync and async refinements
    const result = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
    });

    if (!result.success) {
        // Return a 400 with the formatted Zod errors
        return res.status(400).json({
            message: "Validation Error",
            errors: result.error.flatten().fieldErrors,
        });
    }

    // Replace req with the validated/transformed data
    req.body = result.data.body;
    req.query = result.data.query;
    req.params = result.data.params;

    next();
});