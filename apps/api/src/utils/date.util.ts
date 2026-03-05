/**
 * Date Utility Functions
 * 
 * Handles business day calculations for settlement ETAs.
 * Razorpay typically settles in T+2 business days (excluding weekends).
 */

/**
 * Adds business days to a date, skipping weekends (Saturday=6, Sunday=0).
 * 
 * @param startDate - The starting date
 * @param businessDays - Number of business days to add (default: 2)
 * @returns Date with business days added
 * 
 * @example
 * // If today is Friday, adding 2 business days gives Tuesday
 * addBusinessDays(new Date('2024-03-01'), 2) // Friday -> Tuesday (skips Sat, Sun, Mon)
 */
export function addBusinessDays(startDate: Date, businessDays: number = 2): Date {
    const result = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < businessDays) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
        }
    }

    return result;
}

/**
 * Calculates the settlement ETA for a Razorpay payment.
 * Razorpay settles in T+2 business days (excluding weekends).
 * 
 * @param capturedAt - The date when payment was captured
 * @returns Settlement ETA date
 */
export function calculateSettlementEta(capturedAt: Date = new Date()): Date {
    return addBusinessDays(capturedAt, 2);
}
