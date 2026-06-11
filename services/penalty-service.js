
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const WARNING_THRESHOLD_DAYS = 3;
const SUSPENSION_DURATION_DAYS = 10;

export const calculateLatePenalty = (returnDate, dueDate) => {
    if (returnDate <= dueDate) {
        return {
            action: "NONE",
            clientMessage: "The book was successfully returned on time."
        };
    }

    // Calculate distinct calendar day differences
    const millisecondsDiff = returnDate - dueDate;
    const daysLate = Math.ceil(millisecondsDiff / MS_PER_DAY);

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