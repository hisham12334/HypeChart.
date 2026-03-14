/**
 * Payments Controller
 *
 * GET  /api/payments/balance           — returns processing/available/paidOut balances
 * GET  /api/payments/transactions      — paginated transaction list with order info
 * POST /api/payments/payout            — creates a Payout and marks SETTLED txns as PAID_OUT
 * POST /api/payments/sync-settlements  — manually trigger settlement sync from Razorpay
 * POST /api/payments/confirm-payout    — brand owner manually confirms payout received in bank
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger';
import { runSettlementSync } from '../jobs/settlement-sync.job';

const prisma = new PrismaClient();

export class PaymentsController {

    // -------------------------------------------------------------------------
    // GET /api/payments/balance
    // Calculates balances in real-time from Transaction rows (no stored column).
    // -------------------------------------------------------------------------
    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const [processing, available, paidOut] = await Promise.all([
                // Processing = money captured but not yet settled
                prisma.transaction.aggregate({
                    where: { userId, status: 'CAPTURED' },
                    _sum: { netAmount: true },
                }),

                // Available = settled, ready for payout
                prisma.transaction.aggregate({
                    where: { userId, status: 'SETTLED' },
                    _sum: { netAmount: true },
                }),

                // Paid out this month
                prisma.transaction.aggregate({
                    where: {
                        userId,
                        status: 'PAID_OUT',
                        paidOutAt: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                    _sum: { netAmount: true },
                }),
            ]);

            // Find the next earliest settlementEta for any CAPTURED transaction
            const nextSettlement = await prisma.transaction.findFirst({
                where: { userId, status: 'CAPTURED', settlementEta: { not: null } },
                orderBy: { settlementEta: 'asc' },
                select: { settlementEta: true },
            });

            res.json({
                success: true,
                data: {
                    processing: Number(processing._sum.netAmount ?? 0),
                    available: Number(available._sum.netAmount ?? 0),
                    paidOutThisMonth: Number(paidOut._sum.netAmount ?? 0),
                    nextSettlementEta: nextSettlement?.settlementEta ?? null,
                },
            });
        } catch (error) {
            logger.error('PaymentsController.getBalance failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({ success: false, error: 'Failed to fetch balance' });
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/payments/transactions?page=1&limit=20
    // -------------------------------------------------------------------------
    async getTransactions(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
            const skip = (page - 1) * limit;

            const [total, transactions] = await Promise.all([
                prisma.transaction.count({ where: { userId } }),
                prisma.transaction.findMany({
                    where: { userId },
                    orderBy: { capturedAt: 'desc' },
                    skip,
                    take: limit,
                    include: {
                        order: {
                            select: { orderNumber: true, id: true },
                        },
                    },
                }),
            ]);

            const rows = transactions.map((t) => ({
                id: t.id,
                orderNumber: t.order?.orderNumber ?? null,
                orderId: t.orderId ?? null,
                razorpayOrderId: t.razorpayOrderId,
                razorpayPaymentId: t.razorpayPaymentId,
                razorpaySettlementId: t.razorpaySettlementId,
                grossAmount: Number(t.grossAmount),
                platformFee: Number(t.platformFee),
                razorpayFee: Number(t.razorpayFee),
                netAmount: Number(t.netAmount),
                status: t.status,
                settlementEta: t.settlementEta,
                capturedAt: t.capturedAt,
                settledAt: t.settledAt,
                paidOutAt: t.paidOutAt,
                payoutId: t.payoutId,
            }));

            res.json({
                success: true,
                data: rows,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            logger.error('PaymentsController.getTransactions failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/payout
    // Creates a Payout and atomically links all SETTLED, unlinked transactions.
    // Guard: WHERE status='SETTLED' AND payoutId IS NULL — prevents double-linking.
    // -------------------------------------------------------------------------
    async createPayout(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            // Find all SETTLED transactions that haven't been linked to a payout yet
            const settledTxns = await prisma.transaction.findMany({
                where: {
                    userId,
                    status: 'SETTLED',
                    payoutId: null, // Only unlinked — prevents race condition double-linking
                },
            });

            if (settledTxns.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'No settled transactions available for payout',
                });
                return;
            }

            const totalAmount = settledTxns.reduce(
                (sum, t) => sum + Number(t.netAmount),
                0
            );

            const now = new Date();

            // Atomic: create Payout + update all transactions in a single DB transaction
            const payout = await prisma.$transaction(async (tx) => {
                // 1. Create Payout record
                const newPayout = await tx.payout.create({
                    data: {
                        userId,
                        amount: totalAmount,
                        status: 'INITIATED',
                    },
                });

                // 2. Link transactions + mark PAID_OUT
                await tx.transaction.updateMany({
                    where: {
                        id: { in: settledTxns.map((t) => t.id) },
                        // Double-guard inside the transaction too
                        status: 'SETTLED',
                        payoutId: null,
                    },
                    data: {
                        status: 'PAID_OUT',
                        paidOutAt: now,
                        payoutId: newPayout.id,
                    },
                });

                return newPayout;
            });

            logger.info('Payout created', {
                payoutId: payout.id,
                userId,
                amount: totalAmount,
                transactionCount: settledTxns.length,
            });

            res.json({
                success: true,
                data: {
                    payoutId: payout.id,
                    amount: totalAmount,
                    transactionCount: settledTxns.length,
                    status: 'INITIATED',
                },
            });
        } catch (error) {
            logger.error('PaymentsController.createPayout failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            res.status(500).json({ success: false, error: 'Payout creation failed' });
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/sync-settlements
    // Step 1 — calls Razorpay's Settlement Recon API (the correct endpoint that
    //           maps payments to settlements). Marks matched CAPTURED txns → SETTLED.
    // Step 2 — ETA safety net: any CAPTURED transactions whose estimated T+3
    //           settlement date has already passed get marked SETTLED too.
    //           This catches anything the Recon API misses (e.g. very recent
    //           settlements not yet indexed, or API rate limiting).
    // -------------------------------------------------------------------------
    async syncSettlements(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            logger.info('Manual settlement sync triggered', { userId });

            // ── Step 1: Razorpay Settlement Recon API ─────────────────────────
            // runSettlementSync now uses fetchRecon (the correct endpoint).
            // It throws on real API errors so we can surface them.
            let reconError: string | null = null;
            try {
                await runSettlementSync();
            } catch (err) {
                reconError = err instanceof Error ? err.message : 'Razorpay API error';
                logger.warn('Settlement Sync: Recon API step failed, continuing with ETA fallback', { reconError });
            }

            // ── Step 2: ETA safety-net fallback ─────────────────────────────
            // Settle any remaining CAPTURED transactions whose estimated T+3
            // settlement date has already passed. The Recon step above will have
            // already matched most via payment ID; this catches the rest.
            const now = new Date();
            const overdueTxns = await prisma.transaction.findMany({
                where: {
                    userId,
                    status: 'CAPTURED',
                    settlementEta: { lte: now },
                },
            });

            let etaSettled = 0;
            if (overdueTxns.length > 0) {
                await prisma.transaction.updateMany({
                    where: {
                        id: { in: overdueTxns.map((t) => t.id) },
                        status: 'CAPTURED',
                    },
                    data: {
                        status: 'SETTLED',
                        settledAt: now,
                    },
                });
                etaSettled = overdueTxns.length;
                logger.info(`Settlement Sync: ETA fallback settled ${etaSettled} transactions for user ${userId}`);
            }

            const parts: string[] = [];
            if (etaSettled > 0) parts.push(`${etaSettled} moved to Available`);
            if (parts.length === 0) parts.push('No new settlements found');
            if (reconError) parts.push(`(Razorpay API: ${reconError})`);

            res.json({
                success: true,
                message: `Sync complete — ${parts.join('. ')}.`,
                etaSettled,
                reconError,
            });
        } catch (error) {
            logger.error('PaymentsController.syncSettlements failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            res.status(500).json({ success: false, error: 'Settlement sync failed' });
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/payments/confirm-payout
    // Brand owner manually confirms that a payout has been received in their bank.
    // Body: { payoutId: string }
    //
    // This is needed because platform payouts are done manually by the platform
    // owner — the system cannot auto-detect when money hits the brand's bank.
    // Only the brand owner knows this, and they self-report it here.
    // -------------------------------------------------------------------------
    async confirmPayoutReceived(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const { payoutId } = req.body;
            if (!payoutId) {
                res.status(400).json({ success: false, error: 'payoutId is required' });
                return;
            }

            // Verify the payout belongs to this user
            const payout = await prisma.payout.findFirst({
                where: { id: payoutId, userId },
                include: { transactions: true },
            });

            if (!payout) {
                res.status(404).json({ success: false, error: 'Payout not found' });
                return;
            }

            if (payout.status === 'CONFIRMED') {
                res.status(400).json({ success: false, error: 'Payout already confirmed' });
                return;
            }

            const now = new Date();

            // Mark payout as CONFIRMED and stamp confirmedAt
            await prisma.$transaction(async (tx) => {
                await tx.payout.update({
                    where: { id: payoutId },
                    data: {
                        status: 'CONFIRMED',
                        processedAt: now,
                    },
                });

                // Also update all linked transactions to have paidOutAt confirmed
                if (payout.transactions.length > 0) {
                    await tx.transaction.updateMany({
                        where: {
                            payoutId,
                            userId,
                        },
                        data: {
                            paidOutAt: now,
                        },
                    });
                }
            });

            logger.info('Payout confirmed by brand owner', { payoutId, userId, amount: payout.amount });

            res.json({
                success: true,
                message: 'Payout confirmed successfully. Your ledger has been updated.',
                data: { payoutId, confirmedAt: now },
            });
        } catch (error) {
            logger.error('PaymentsController.confirmPayoutReceived failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            res.status(500).json({ success: false, error: 'Failed to confirm payout' });
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/payments/payouts
    // Returns a list of all payouts for the current user with their status.
    // -------------------------------------------------------------------------
    async getPayouts(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const payouts = await prisma.payout.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    transactions: {
                        select: { id: true, grossAmount: true, netAmount: true, capturedAt: true },
                    },
                },
            });

            res.json({
                success: true,
                data: payouts.map((p) => ({
                    id: p.id,
                    amount: Number(p.amount),
                    status: p.status,
                    transactionCount: p.transactions.length,
                    createdAt: p.createdAt,
                    processedAt: p.processedAt,
                })),
            });
        } catch (error) {
            logger.error('PaymentsController.getPayouts failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            res.status(500).json({ success: false, error: 'Failed to fetch payouts' });
        }
    }
}
