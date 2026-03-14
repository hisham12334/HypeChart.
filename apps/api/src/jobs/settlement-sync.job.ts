/**
 * Settlement Sync Cron Job
 *
 * Runs every 6 hours (at 2AM, 8AM, 2PM, 8PM).
 *
 * SDK REALITY (razorpay ^2.9.6):
 * ─────────────────────────────────────────
 * The installed SDK does NOT have fetchRecon().
 * The correct method is `razorpay.settlements.reports({ year, month, day?, count?, skip? })`
 * which hits GET /v1/settlements/recon/combined.
 *
 * Each item returned has:
 *   - entity_id     → the razorpay payment_id (pay_XXXX)
 *   - settlement_id → the settlement it belongs to (setl_XXXX)
 *   - settled_at    → unix timestamp of settlement
 *   - type          → "payment" | "refund" | "transfer" | "adjustment"
 *
 * We call reports() for each month between the oldest CAPTURED transaction
 * and today, then match entity_id against Transaction.razorpayPaymentId.
 */

import cron from 'node-cron';
import Razorpay from 'razorpay';
import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

function getPlatformRazorpay(): Razorpay {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        throw new Error('Platform Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not set');
    }

    return new Razorpay({ key_id, key_secret });
}

/**
 * Fetches all recon items for a given year+month by paginating through
 * the reports() endpoint (max 1000 per call).
 */
async function fetchReconForMonth(
    razorpay: Razorpay,
    year: number,
    month: number // 1-indexed (1 = Jan, 12 = Dec)
): Promise<any[]> {
    const allItems: any[] = [];
    const pageSize = 1000;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
        const response = await (razorpay as any).settlements.reports({
            year,
            month,
            count: pageSize,
            skip,
        });

        // SDK v2.9.6 returns the recon object directly (not wrapped in .items)
        // Guard against various response shapes
        let items: any[] = [];
        if (Array.isArray(response)) {
            items = response;
        } else if (response?.items && Array.isArray(response.items)) {
            items = response.items;
        } else if (response?.entity_id) {
            // Single item returned directly
            items = [response];
        }

        allItems.push(...items);

        if (items.length < pageSize) {
            hasMore = false;
        } else {
            skip += pageSize;
        }
    }

    return allItems;
}

/**
 * Core sync logic — exported so it can be called manually via the API.
 *
 * Strategy:
 * 1. Find the oldest CAPTURED transaction to know how far back to look.
 * 2. Call reports() for every year-month from then until now.
 * 3. For each recon item of type "payment", match entity_id to our DB.
 * 4. Mark matched CAPTURED transactions as SETTLED.
 */
export async function runSettlementSync(): Promise<void> {
    logger.info('💸 Running Settlement Sync Job...');

    let razorpay: Razorpay;
    try {
        razorpay = getPlatformRazorpay();
    } catch (err) {
        logger.error('Settlement Sync: Razorpay not configured', { error: (err as Error).message });
        return;
    }

    try {
        // Find oldest CAPTURED transaction to determine the date range to query
        const oldestCaptured = await prisma.transaction.findFirst({
            where: { status: 'CAPTURED' },
            orderBy: { capturedAt: 'asc' },
            select: { capturedAt: true },
        });

        if (!oldestCaptured) {
            logger.info('Settlement Sync: No CAPTURED transactions to sync.');
            return;
        }

        const startDate = oldestCaptured.capturedAt;
        const now = new Date();

        // Build list of year-month pairs to query
        const months: Array<{ year: number; month: number }> = [];
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (cursor <= now) {
            months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 }); // month is 1-indexed
            cursor.setMonth(cursor.getMonth() + 1);
        }

        logger.info(`Settlement Sync: Querying ${months.length} month(s) of recon data...`);

        let totalUpdated = 0;
        let totalSkipped = 0;

        for (const { year, month } of months) {
            logger.info(`Settlement Sync: Fetching recon for ${year}-${String(month).padStart(2, '0')}...`);

            let items: any[] = [];
            try {
                items = await fetchReconForMonth(razorpay, year, month);
            } catch (err) {
                logger.warn(`Settlement Sync: Failed to fetch recon for ${year}-${month}`, {
                    error: err instanceof Error ? err.message : String(err),
                });
                continue; // Skip this month, try the next
            }

            logger.info(`Settlement Sync: ${year}-${String(month).padStart(2, '0')} → ${items.length} recon item(s)`);

            for (const item of items) {
                // Only process payment-type entities (not refunds, adjustments, etc.)
                if (item.type !== 'payment') {
                    continue;
                }

                const paymentId: string | undefined = item.entity_id;
                const settlementId: string | undefined = item.settlement_id;
                const settledAt: Date = item.settled_at
                    ? new Date(item.settled_at * 1000)
                    : new Date();

                if (!paymentId || !settlementId) {
                    continue;
                }

                // Match on razorpayPaymentId — only update if still CAPTURED
                const transaction = await prisma.transaction.findFirst({
                    where: {
                        razorpayPaymentId: paymentId,
                        status: 'CAPTURED',
                    },
                });

                if (!transaction) {
                    totalSkipped++;
                    continue;
                }

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'SETTLED',
                        settledAt,
                        razorpaySettlementId: settlementId,
                    },
                });

                totalUpdated++;
                logger.info('Settlement Sync: Marked SETTLED', {
                    transactionId: transaction.id,
                    razorpayPaymentId: paymentId,
                    settlementId,
                    settledAt,
                });
            }
        }

        logger.info(`✅ Settlement Sync complete. Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);

    } catch (error) {
        logger.error('❌ Settlement Sync Job failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw so the controller can surface the real error
    }
}

/**
 * Schedules the job to run every 6 hours.
 */
export const startSettlementSyncJob = (): void => {
    cron.schedule('0 */6 * * *', () => {
        runSettlementSync().catch((err) => {
            logger.error('Settlement Sync: Uncaught error in cron handler', {
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        });
    });

    logger.info('⏰ Settlement Sync Job scheduled (every 6 hours)');
};
