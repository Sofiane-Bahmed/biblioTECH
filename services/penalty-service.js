
export const calculateLatePenalty = (returnDate, dueDate) => {
    if (returnDate <= dueDate) {
        return {
            action: "NONE",
            clientMessage: "The book was successfully returned on time."
        };
    }

    // Calculate distinct calendar day differences
    const millisecondsDiff = returnDate - dueDate;
    const daysLate = Math.ceil(millisecondsDiff / (1000 * 60 * 60 * 24));

    if (daysLate <= 3) {
        return {
            action: "WARNING",
            clientMessage: `Book returned, but it was ${daysLate} day(s) late. A warning email has been sent. Please return books on time to avoid account suspension.`
        };
    }

    // Calculate 10 days out from current time execution context
    const suspensionDate = new Date(returnDate.getTime() + 10 * 24 * 60 * 60 * 1000);

    return {
        action: "SUSPEND",
        suspensionDate,
        clientMessage: `Book returned, but you are suspended for 10 days due to a delayed return of ${daysLate} days.`
    };
};