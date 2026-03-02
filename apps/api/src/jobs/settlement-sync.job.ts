/**
 * Settlement Sync Cron Job
 *
 * Runs every night at 2AM.
 * Polls Razorpay Settlements API, matches by razorpayPaymentId (NOT orderId — 
 * Razorpay entity_id in settlements maps to payment_id).
 * Updates matched Transaction rows: status=SETTLED, settledAt, razorpaySettlementId.
 */

import cron from 'node-cron';
import Razorpay from 'razorpay';
import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Platform Razorpay instance (for fetching settlements via platform account)
function getPlatformRazorpay(): Razorpay {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
        throw new Error('Platform Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not set');
    }

    return new Razorpay({ key_id, key_secret });
}

/**
 * Adds `count` calendar days to a date (simple, not business-day aware).
 * The cron will correct the real date once settlement arrives.
 */
function addDays(date: Date, count: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + count);
    return d;
}

/**
 * Core sync logic — exported so it can be called manually / tested.
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
        // Fetch recent settlements (up to 100 items, last 7 days)
        const to = Math.floor(Date.now() / 1000);
        const from = to - 7 * 24 * 60 * 60; // 7 days ago

        const response = await (razorpay as any).settlements.all({
            from,
            to,
            count: 100,
        });

        const settlements: any[] = response?.items ?? [];

        if (settlements.length === 0) {
            logger.info('Settlement Sync: No settlements found in the last 7 days.');
            return;
        }

        logger.info(`Settlement Sync: Processing ${settlements.length} settlement(s)...`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const settlement of settlements) {
            const settlementId: string = settlement.id;

            // Each settlement has a `details` array of payment entities
            // entity_id maps to the razorpay payment_id
            const details: any[] = settlement.details ?? [];

            for (const detail of details) {
                // CRITICAL: match on razorpayPaymentId, NOT razorpayOrderId
                const paymentId: string | undefined = detail.entity_id;

                if (!paymentId) {
                    logger.warn('Settlement Sync: detail missing entity_id', { settlementId, detail });
                    continue;
                }

                // Only update transactions that are still CAPTURED (not yet settled/paid)
                const transaction = await prisma.transaction.findFirst({
                    where: {
                        razorpayPaymentId: paymentId,
                        status: 'CAPTURED',
                    },
                });

                if (!transaction) {
                    skippedCount++;
                    continue; // Already settled, or not our transaction
                }

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'SETTLED',
                        settledAt: new Date(),
                        razorpaySettlementId: settlementId,
                    },
                });

                updatedCount++;
                logger.info(`Settlement Sync: Marked SETTLED`, {
                    transactionId: transaction.id,
                    razorpayPaymentId: paymentId,
                    settlementId,
                });
            }
        }

        logger.info(`✅ Settlement Sync complete. Updated: ${updatedCount}, Skipped (already settled/not found): ${skippedCount}`);
    } catch (error) {
        logger.error('❌ Settlement Sync Job failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
}

/**
 * Schedules the job at 2AM every night.
 */
export const startSettlementSyncJob = (): void => {
    cron.schedule('0 2 * * *', () => {
        runSettlementSync().catch((err) => {
            logger.error('Settlement Sync: Uncaught error in cron handler', {
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        });
    });

    logger.info('⏰ Settlement Sync Job scheduled (2AM daily)');
};
