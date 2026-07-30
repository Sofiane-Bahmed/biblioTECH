import z from "zod";

import { extendPickupDeadlineSchema } from "./reservation-schema.js";

export type extendPickupDeadlineRequest = z.infer<typeof extendPickupDeadlineSchema>;
export type extendPickupDeadlineParams = extendPickupDeadlineRequest["params"];
export type extendPickupDeadlineBody = extendPickupDeadlineRequest["body"];
