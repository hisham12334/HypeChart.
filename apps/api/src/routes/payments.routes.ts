import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
const controller = new PaymentsController();

// All routes require authentication
router.use(requireAuth);

// GET /api/payments/balance
router.get('/balance', (req, res) => controller.getBalance(req, res));

// GET /api/payments/transactions?page=1&limit=20
router.get('/transactions', (req, res) => controller.getTransactions(req, res));

// GET /api/payments/payouts — list all payouts with status
router.get('/payouts', (req, res) => controller.getPayouts(req, res));

// POST /api/payments/payout
router.post('/payout', (req, res) => controller.createPayout(req, res));

// POST /api/payments/sync-settlements
router.post('/sync-settlements', (req, res) => controller.syncSettlements(req, res));

// POST /api/payments/confirm-payout — brand owner manually confirms bank receipt
router.post('/confirm-payout', (req, res) => controller.confirmPayoutReceived(req, res));

export default router;
