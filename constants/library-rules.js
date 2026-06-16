
export const TIME_CONSTANTS = Object.freeze({
    MS_PER_DAY: 1000 * 60 * 60 * 24,
    HOURS_PER_DAY: 24,
});

export const PENALTY_RULES = Object.freeze({
    WARNING_THRESHOLD_DAYS: 3,
    SUSPENSION_DURATION_DAYS: 10,
    MAX_RENEWALS_ALLOWED: 1,
    RENEWAL_EXTENSION_DAYS: 7,
});

export const BORROWING_RULES = Object.freeze({
    BORROW_PERIOD_DAYS: 7,
    RENEWAL_DAYS_EXTENSION: 7,
});