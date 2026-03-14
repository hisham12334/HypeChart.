/**
 * Settlement Sync Cron Job
 *
 * Runs every 6 hours (at 2AM, 8AM, 2PM, 8PM).
 *
 * HOW RAZORPAY SETTLEMENTS ACTUALLY WORK:
 * ─────────────────────────────────────────
 * `settlements.all()` returns only settlement HEADERS (id, amount, status, dates).
 * It does NOT include the constituent payments inside each settlement.
 *
 * To get the payment-to-settlement mapping we must use the Settlement Recon API:
 *   GET /v1/settlements/recon/combined?from=&to=&count=&skip=
 *
 * Each recon item has:
 *   - entity_id     → the razorpay payment_id (pay_XXXX)
 *   - settlement_id → the settlement it belongs to (setl_XXXX)
 *   - settled_at    → unix timestamp of settlement
 *   - type          → "payment" | "refund" | "transfer" | "adjustment"
 *
 * We match entity_id against our Transaction.razorpayPaymentId.
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
 * Core sync logic — exported so it can be called manually via the API.
 *
 * Uses the Settlement Recon API (not settlements.all) to correctly get
 * the payment_id → settlement_id mapping.
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
        const to = Math.floor(Date.now() / 1000);
        const from = to - 30 * 24 * 60 * 60; // Last 30 days to catch older settlements

        // ─── STEP 1: Use the Settlement Recon API ───────────────────────────
        // This is the ONLY Razorpay endpoint that maps payments → settlements.
        // settlements.all() does NOT contain this data.
        //
        // Paginate through all recon items (max 1000 per call, we do batches of 200).
        let skip = 0;
        const pageSize = 200;
        let totalUpdated = 0;
        let totalSkipped = 0;
        let hasMore = true;

        while (hasMore) {
            const reconResponse = await (razorpay as any).settlements.fetchRecon({
                from,
                to,
                count: pageSize,
                skip,
            });

            const items: any[] = reconResponse?.items ?? [];

            if (items.length === 0) {
                hasMore = false;
                break;
            }

            logger.info(`Settlement Sync: Recon page — skip=${skip}, got ${items.length} items`);

            for (const item of items) {
                // Only process payment-type entities (not refunds, adjustments, etc.)
                if (item.type !== 'payment') {
                    continue;
                }

                const paymentId: string | undefined = item.entity_id;
                const settlementId: string | undefined = item.settlement_id;
                // settled_at is a unix timestamp in seconds
                const settledAt: Date = item.settled_at
                    ? new Date(item.settled_at * 1000)
                    : new Date();

                if (!paymentId || !settlementId) {
                    logger.warn('Settlement Sync: Recon item missing entity_id or settlement_id', { item });
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
                    continue; // Already settled, refunded, or not our transaction
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
                logger.info('Settlement Sync: Marked SETTLED via Recon API', {
                    transactionId: transaction.id,
                    razorpayPaymentId: paymentId,
                    settlementId,
                    settledAt,
                });
            }

            // If we got fewer items than requested, we're on the last page
            if (items.length < pageSize) {
                hasMore = false;
            } else {
                skip += pageSize;
            }
        }

        logger.info(`✅ Settlement Sync (Recon) complete. Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);

    } catch (error) {
        logger.error('❌ Settlement Sync Job failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        // Re-throw so the controller can surface the real error message
        throw error;
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
