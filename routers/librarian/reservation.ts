import express, { Router } from "express"

import { validate } from "../../middlewares/validate.js";

import { extendPickupDeadlineSchema } from "../../validations/librarian/reservation/reservation-schema.js";
import { extendPickupDeadline } from "../../controllers/librarian/reservation.js";

export const librarianReservationRouter: Router = express.Router();

librarianReservationRouter.post("/:reservationId/extend", validate(extendPickupDeadlineSchema), extendPickupDeadline);










