import { Response } from "express";

import {
    extendPickupDeadlineService,
    forceQueuePositionService,
    placeStaffHoldService
} from "../../services/reservation-service.js";
import asyncHandler from "../../utils/async-handler.js";
import { AuthenticatedRequest } from "../../types/auth.js";
import { TIME_CONSTANTS } from "../../constants/library-rules.js";
import {
    extendPickupDeadlineBody,
    extendPickupDeadlineParams,
    forceQueuePositionBody,
    forceQueuePositionParams,
    placeStaffHoldBody
} from "../../validations/librarian/reservation/reservation-types.js";

export const extendPickupDeadline = asyncHandler(async (
    req: AuthenticatedRequest<extendPickupDeadlineParams, extendPickupDeadlineBody, any>,
    res: Response
): Promise<void> => {
    const { reservationId } = req.params;
    const { extensionHours, reason } = req.body;
    const staffId = req.user!._id;

    const result = await extendPickupDeadlineService({
        reservationId,
        extensionHours,
        reason,
        staffId,
    });

    res.status(result.code).json(result);
});

export const placeStaffHold = asyncHandler(async (
    req: AuthenticatedRequest<any, placeStaffHoldBody, any>,
    res: Response
): Promise<void> => {
    const { userId, bookId, reason } = req.body;
    const staffId = req.user!._id;

    const result = await placeStaffHoldService({
        userId,
        bookId,
        reason,
        staffId,
    });

    res.status(result.code).json(result);
});

export const forceQueuePosition = asyncHandler(async (
    req: AuthenticatedRequest<forceQueuePositionParams, forceQueuePositionBody, any>,
    res: Response
): Promise<void> => {
    const { reservationId } = req.params;
    const { newPosition, reason } = req.body;
    const staffId = req.user!._id;

    const result = await forceQueuePositionService({
        reservationId,
        newPosition,
        reason,
        staffId,
    });

    res.status(result.code).json(result);
});
