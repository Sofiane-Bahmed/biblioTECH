import { Request } from "express";

export type UserRole = "user" | "admin" | "librarian";

export interface AuthUser {
    _id: string;
    role: UserRole;
    name?: string;
    email?: string;
}

export interface AuthenticatedRequest<
    Params = any,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
    user?: AuthUser;
}