import express, { Router } from "express"

import { validate } from "../../middlewares/validate.js";

import {
    extendPickupDeadlineSchema,
    placeStaffHoldSchema
} from "../../validations/librarian/reservation/reservation-schema.js";
import {
    extendPickupDeadline,
    placeStaffHold
} from "../../controllers/librarian/reservation.js";

export const librarianReservationRouter: Router = express.Router();

librarianReservationRouter.post("/manual", validate(placeStaffHoldSchema), placeStaffHold);

librarianReservationRouter.post("/:reservationId/extend", validate(extendPickupDeadlineSchema), extendPickupDeadline);










