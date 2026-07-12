import {
    Request,
    Response,
    NextFunction,
    ErrorRequestHandler
} from "express";

export const errorMiddleware: ErrorRequestHandler = (
    err: any,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
): void => {
    console.error(err.stack || err);

    const statusCode = typeof err.status === "number" ? err.status : 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
};