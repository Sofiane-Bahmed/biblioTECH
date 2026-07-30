import express, { Router } from "express"

import { validate } from "../../middlewares/validate.js";

import {
    extendPickupDeadlineSchema,
    forceQueuePositionSchema,
    placeStaffHoldSchema
} from "../../validations/librarian/reservation/reservation-schema.js";
import {
    extendPickupDeadline,
    forceQueuePosition,
    placeStaffHold
} from "../../controllers/librarian/reservation.js";

export const librarianReservationRouter: Router = express.Router();

librarianReservationRouter.post("/manual", validate(placeStaffHoldSchema), placeStaffHold);

librarianReservationRouter.patch("/:reservationId/extend", validate(extendPickupDeadlineSchema), extendPickupDeadline);
librarianReservationRouter.patch("/:reservationId/reorder", validate(forceQueuePositionSchema), forceQueuePosition);











