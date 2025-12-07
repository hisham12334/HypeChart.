import crypto from 'crypto';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { OrderUpdateService } from './order-update.service';
import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const prisma = new PrismaClient();

export interface WebhookProcessingResult {
  success: boolean;
  shouldRetry: boolean;
  message: string;
  eventId?: string;
  eventType?: string;
  orderId?: string;
  orderNumber?: string;
  error?: any;
}

export interface RazorpayPaymentCapturedEvent {
  event: 'payment.captured';
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export class WebhookService {
  private webhookEventRepository: WebhookEventRepository;
  private orderUpdateService: OrderUpdateService;

  constructor() {
    this.webhookEventRepository = new WebhookEventRepository();
    this.orderUpdateService = new OrderUpdateService();
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * @param payload - Raw request body as string
   * @param signature - Signature from x-razorpay-signature header
   * @param secret - Webhook secret from environment
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      if (!secret) {
        logger.error('Webhook secret is not configured', {
          hasSecret: false,
        });
        throw new Error('Webhook secret is not configured');
      }

      if (!signature) {
        logger.security('Signature verification attempted with missing signature', {
          hasPayload: !!payload,
          payloadLength: payload?.length,
        });
        throw new Error('Signature is missing');
      }

      // Compute expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.security('Webhook signature verification failed', {
          signatureLength: signature.length,
          expectedSignatureLength: expectedSignature.length,
        });
      }

      return isValid;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Input buffers must have the same byte length')) {
        logger.security('Signature verification failed - length mismatch', {
          error: error.message,
        });
      } else {
        logger.error('Signature verification error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
      }
      return false;
    }
  }

  /**
   * Process incoming webhook
   * @param payload - Raw request body as string
   * @param signature - Signature from x-razorpay-signature header
   * @returns Processing result with success status and retry flag
   */
  async processWebhook(
    payload: string,
    signature: string
  ): Promise<WebhookProcessingResult> {
    let eventId: string | undefined;
    let eventType: string | undefined;
    let orderId: string | undefined;
    let orderNumber: string | undefined;

    try {
      // Verify signature first
      if (!WEBHOOK_SECRET) {
        logger.error('RAZORPAY_WEBHOOK_SECRET is not configured - cannot process webhooks', {
          hasSecret: false,
        });
        return {
          success: false,
          shouldRetry: false,
          message: 'Webhook secret not configured',
        };
      }

      const isValid = this.verifySignature(payload, signature, WEBHOOK_SECRET);

      if (!isValid) {
        logger.security('Webhook signature verification failed - rejecting request', {
          signatureProvided: !!signature,
          payloadLength: payload.length,
        });
        return {
          success: false,
          shouldRetry: false,
          message: 'Invalid signature',
        };
      }

      // Parse webhook payload
      let event: any;
      try {
        event = JSON.parse(payload);
        eventId = event.id;
        eventType = event.event;
      } catch (parseError) {
        logger.error('Failed to parse webhook payload - invalid JSON', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          payloadLength: payload.length,
          payloadPreview: payload.substring(0, 100),
        });
        return {
          success: false,
          shouldRetry: false,
          message: 'Invalid JSON payload',
          eventId,
          eventType,
        };
      }

      // Validate event structure
      if (!eventId || !eventType) {
        logger.error('Webhook payload missing required fields', {
          hasEventId: !!eventId,
          hasEventType: !!eventType,
          eventId,
          eventType,
        });
        return {
          success: false,
          shouldRetry: false,
          message: 'Invalid webhook payload structure',
          eventId,
          eventType,
        };
      }

      logger.info('Webhook signature verified successfully', {
        eventId,
        eventType,
      });

      // Check idempotency
      let alreadyProcessed: boolean;
      try {
        alreadyProcessed = await this.webhookEventRepository.isEventProcessed(eventId);
      } catch (error) {
        logger.error('Failed to check webhook event idempotency - database error', {
          eventId,
          eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
        return {
          success: false,
          shouldRetry: true,
          message: 'Database error checking idempotency',
          eventId,
          eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      if (alreadyProcessed) {
        logger.info('Webhook event already processed - skipping (idempotent)', {
          eventId,
          eventType,
        });
        return {
          success: true,
          shouldRetry: false,
          message: 'Event already processed',
          eventId,
          eventType,
        };
      }

      // Route to appropriate handler based on event type
      // Process within a transaction to ensure atomicity
      try {
        await prisma.$transaction(async (tx) => {
          if (eventType === 'payment.captured') {
            const result = await this.handlePaymentCaptured(event);
            orderId = result.orderId;
            orderNumber = result.orderNumber;
          } else {
            logger.warn('Unhandled webhook event type - storing but not processing', {
              eventId,
              eventType,
            });
          }

          // Store processed event in database
          // eventId and eventType are guaranteed to be strings at this point due to earlier validation
          await this.webhookEventRepository.markEventProcessed(
            eventId!,
            eventType!,
            event
          );

          logger.info('Webhook event stored successfully', {
            eventId,
            eventType,
            orderId,
            orderNumber,
          });
        });

        logger.info('Webhook processed successfully', {
          eventId,
          eventType,
          orderId,
          orderNumber,
        });

        return {
          success: true,
          shouldRetry: false,
          message: 'Webhook processed successfully',
          eventId,
          eventType,
          orderId,
          orderNumber,
        };
      } catch (error) {
        // Distinguish between retryable and non-retryable errors
        const isRetryable = this.isRetryableError(error);
        
        if (isRetryable) {
          logger.error('Webhook processing failed - retryable error (database/network)', {
            eventId,
            eventType,
            orderId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
          });
        } else {
          logger.error('Webhook processing failed - non-retryable error (business logic)', {
            eventId,
            eventType,
            orderId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          });
        }

        return {
          success: false,
          shouldRetry: isRetryable,
          message: error instanceof Error ? error.message : 'Unknown error',
          eventId,
          eventType,
          orderId,
          orderNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } catch (error) {
      // Unexpected error in outer try-catch
      logger.error('Unexpected error in webhook processing', {
        eventId,
        eventType,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        success: false,
        shouldRetry: true,
        message: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        eventType,
        orderId,
        orderNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Determine if an error is retryable
   * @param error - Error to check
   * @returns true if error should trigger retry, false otherwise
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const errorName = error instanceof Error ? error.constructor.name : '';

    // Database errors are retryable
    if (errorName.includes('Prisma') || errorMessage.includes('prisma')) {
      return true;
    }

    // Connection errors are retryable
    if (errorMessage.includes('connection') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('network')) {
      return true;
    }

    // Transaction errors are retryable
    if (errorMessage.includes('transaction')) {
      return true;
    }

    // Business logic errors are not retryable
    if (errorMessage.includes('order not found') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('missing')) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Handle payment.captured event
   * @param event - Payment captured event from Razorpay
   * @returns Object with orderId and orderNumber if successful
   */
  async handlePaymentCaptured(
    event: RazorpayPaymentCapturedEvent
  ): Promise<{ orderId?: string; orderNumber?: string }> {
    const eventId = event.payload?.payment?.entity?.id;
    
    try {
      // Extract razorpayOrderId and razorpayPaymentId from payload
      const razorpayPaymentId = event.payload?.payment?.entity?.id;
      const razorpayOrderId = event.payload?.payment?.entity?.order_id;

      if (!razorpayPaymentId || !razorpayOrderId) {
        logger.error('Missing required payment data in payment.captured webhook', {
          eventId,
          hasPaymentId: !!razorpayPaymentId,
          hasOrderId: !!razorpayOrderId,
          payloadStructure: JSON.stringify(event.payload).substring(0, 200),
        });
        throw new Error('Invalid payment.captured payload: missing payment or order ID');
      }

      logger.info('Processing payment.captured event', {
        eventId,
        razorpayPaymentId,
        razorpayOrderId,
      });

      // Call OrderUpdateService to update order status
      let result;
      try {
        result = await this.orderUpdateService.markOrderAsPaid(
          razorpayOrderId,
          razorpayPaymentId
        );
      } catch (error) {
        logger.error('OrderUpdateService failed to mark order as paid', {
          eventId,
          razorpayOrderId,
          razorpayPaymentId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error; // Re-throw to trigger retry logic
      }

      if (result.orderNotFound) {
        logger.warn('Order not found for payment.captured event - possible test webhook', {
          eventId,
          razorpayOrderId,
          razorpayPaymentId,
        });
        // Don't throw error - this is a non-retryable scenario
        // Could be a test webhook or order from different environment
        return { orderId: razorpayOrderId };
      }

      if (result.alreadyPaid) {
        logger.info('Order already marked as paid - idempotent operation', {
          eventId,
          orderNumber: result.orderNumber,
          razorpayOrderId,
          razorpayPaymentId,
        });
        return { orderId: razorpayOrderId, orderNumber: result.orderNumber };
      }

      logger.info('Order successfully marked as paid', {
        eventId,
        orderNumber: result.orderNumber,
        razorpayOrderId,
        razorpayPaymentId,
      });

      return { orderId: razorpayOrderId, orderNumber: result.orderNumber };
    } catch (error) {
      logger.error('Error handling payment.captured event', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to trigger retry logic
    }
  }
}
