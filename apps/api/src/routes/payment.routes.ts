import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const controller = new PaymentController();

// POST /api/payments/create-order
router.post('/create-order', controller.createOrder);

// POST /api/payments/verify
router.post('/verify', controller.verifyPayment);

export default router;