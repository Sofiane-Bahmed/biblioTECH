import z from "zod";

import {
    extendPickupDeadlineSchema,
    placeStaffHoldSchema
} from "./reservation-schema.js";

export type extendPickupDeadlineRequest = z.infer<typeof extendPickupDeadlineSchema>;
export type extendPickupDeadlineParams = extendPickupDeadlineRequest["params"];
export type extendPickupDeadlineBody = extendPickupDeadlineRequest["body"];

export type placeStaffHoldRequest = z.infer<typeof placeStaffHoldSchema>;
export type placeStaffHoldBody = placeStaffHoldRequest["body"];


