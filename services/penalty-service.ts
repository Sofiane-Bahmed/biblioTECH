import { PENALTY_RULES, TIME_CONSTANTS } from "../constants/library-rules.js";

const { MS_PER_DAY } = TIME_CONSTANTS;
const {
    WARNING_THRESHOLD_DAYS,
    SUSPENSION_DURATION_DAYS
} = PENALTY_RULES;

interface NoPenaltyResult {
    action: "NONE";
    clientMessage: string;
}

interface WarningPenaltyResult {
    action: "WARNING";
    clientMessage: string;
}

interface SuspensionPenaltyResult {
    action: "SUSPEND";
    suspensionDate: Date;
    clientMessage: string;
}

export type LatePenaltyResult = NoPenaltyResult | WarningPenaltyResult | SuspensionPenaltyResult;

export const calculateLatePenalty = (
    returnDate: Date,
    dueDate: Date
): LatePenaltyResult => {
    
    const d1 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const d2 = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate());

    if (d2 <= d1) {
        return {
            action: "NONE",
            clientMessage: "The book was successfully returned on time."
        };
    }

    const millisecondsDiff = d2.getTime() - d1.getTime();
    const daysLate = Math.round(millisecondsDiff / MS_PER_DAY);

    if (daysLate <= WARNING_THRESHOLD_DAYS) {
        return {
            action: "WARNING",
            clientMessage: `Book returned, but it was ${daysLate} day(s) late. A warning email has been sent. Please return books on time to avoid account suspension.`
        };
    }

    const suspensionDate = new Date(returnDate.getTime() + (SUSPENSION_DURATION_DAYS * MS_PER_DAY));

    return {
        action: "SUSPEND",
        suspensionDate,
        clientMessage: `Book returned, but you are suspended for ${SUSPENSION_DURATION_DAYS} days due to a delayed return of ${daysLate} days.`
    };
};