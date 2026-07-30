import z from "zod";

import {
    extendPickupDeadlineSchema,
    forceQueuePositionSchema,
    placeStaffHoldSchema
} from "./reservation-schema.js";

export type extendPickupDeadlineRequest = z.infer<typeof extendPickupDeadlineSchema>;
export type extendPickupDeadlineParams = extendPickupDeadlineRequest["params"];
export type extendPickupDeadlineBody = extendPickupDeadlineRequest["body"];

export type placeStaffHoldRequest = z.infer<typeof placeStaffHoldSchema>;
export type placeStaffHoldBody = placeStaffHoldRequest["body"];

export type forceQueuePositionRequest = z.infer<typeof forceQueuePositionSchema>;
export type forceQueuePositionParams = forceQueuePositionRequest["params"];
export type forceQueuePositionBody = forceQueuePositionRequest["body"];


