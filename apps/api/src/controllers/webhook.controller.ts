import { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';

export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Handle Razorpay webhook events
   * POST /api/webhooks/razorpay
   */
  async handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
    let eventId: string | undefined;
    let eventType: string | undefined;

    try {
      // Extract x-razorpay-signature header
      const signature = req.headers['x-razorpay-signature'] as string;

      // Return 400 if signature header is missing
      if (!signature) {
        logger.security('Webhook received without signature header', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        res.status(400).json({ error: 'Missing signature header' });
        return;
      }

      // Get raw request body as string for signature verification
      // The body should be a Buffer from express.raw() middleware
      let payload: string;
      try {
        payload = req.body.toString('utf8');
      } catch (error) {
        logger.error('Failed to convert request body to string', {
          error: error instanceof Error ? error.message : 'Unknown error',
          bodyType: typeof req.body,
        });
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }

      // Try to extract event ID and type for logging (before full processing)
      try {
        const parsedPayload = JSON.parse(payload);
        eventId = parsedPayload.id;
        eventType = parsedPayload.event;
      } catch (error) {
        // Ignore parsing errors here, will be handled in processWebhook
      }

      logger.info('Webhook request received', {
        eventId,
        eventType,
        hasSignature: true,
        payloadLength: payload.length,
        ip: req.ip,
      });

      // Call WebhookService.processWebhook with payload and signature
      const result = await this.webhookService.processWebhook(payload, signature);

      // Return 200 for successful processing or non-retryable errors
      if (result.success || !result.shouldRetry) {
        logger.info('Webhook processed', {
          eventId: result.eventId,
          eventType: result.eventType,
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          success: result.success,
          message: result.message,
          retryable: result.shouldRetry,
        });
        res.status(200).json({ received: true, message: result.message });
        return;
      }

      // Return 500 for retryable errors (database failures)
      logger.error('Webhook processing failed - retryable error', {
        eventId: result.eventId,
        eventType: result.eventType,
        message: result.message,
        error: result.error,
      });
      res.status(500).json({ error: 'Processing failed, please retry' });
    } catch (error) {
      // Catch any unexpected errors and return 500 for retry
      logger.error('Unexpected webhook controller error', {
        eventId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
