import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

// No authentication middleware - webhooks are verified via signature
router.post('/razorpay', webhookController.handleRazorpayWebhook.bind(webhookController));

export default router;
