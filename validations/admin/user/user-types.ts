import z from "zod";
import {
    blockUserSchema,
    deleteUserSchema,
    getUserSchema,
    getUsersSchema,
    unblockUserSchema,
    updateUserRoleSchema
} from "./user-schema.js";

export type GetUserRequest = z.infer<typeof getUserSchema>;
export type GetUserParams = GetUserRequest["params"];

export type GetUsersRequest = z.infer<typeof getUsersSchema>;
export type GetUsersQuery = NonNullable<GetUsersRequest["query"]>;

export type DeleteUserRequest = z.infer<typeof deleteUserSchema>;
export type DeleteUserParams = DeleteUserRequest["params"];

export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserRoleParams = UpdateUserRoleRequest["params"];
export type UpdateUserRoleBody = UpdateUserRoleRequest["body"];

export type BlockUserRequest = z.infer<typeof blockUserSchema>;
export type BlockUserParams = BlockUserRequest["params"];

export type UnblockUserRequest = z.infer<typeof unblockUserSchema>;
export type UnblockUserParams = UnblockUserRequest["params"];