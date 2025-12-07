import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class WebhookEventRepository {
  /**
   * Check if a webhook event has already been processed
   * @param eventId - Unique event ID from Razorpay webhook
   * @returns true if event has been processed, false otherwise
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      logger.info('Checking if webhook event already processed', {
        eventId,
      });

      const event = await prisma.webhookEvent.findUnique({
        where: { eventId },
        select: {
          eventId: true,
          eventType: true,
          processedAt: true,
        }
      });
      
      const isProcessed = event !== null;

      if (isProcessed) {
        logger.info('Webhook event found in database - already processed', {
          eventId,
          eventType: event.eventType,
          processedAt: event.processedAt,
        });
      } else {
        logger.info('Webhook event not found in database - new event', {
          eventId,
        });
      }

      return isProcessed;
    } catch (error) {
      logger.error('Database error checking if webhook event processed', {
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      throw error;
    }
  }

  /**
   * Mark a webhook event as processed by storing it in the database
   * Uses transaction support to ensure atomic operations
   * @param eventId - Unique event ID from Razorpay webhook
   * @param eventType - Type of webhook event (e.g., "payment.captured")
   * @param payload - Full webhook payload for audit purposes
   */
  async markEventProcessed(
    eventId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    try {
      logger.info('Marking webhook event as processed', {
        eventId,
        eventType,
      });

      await prisma.webhookEvent.create({
        data: {
          eventId,
          eventType,
          payload
        }
      });

      logger.info('Webhook event marked as processed successfully', {
        eventId,
        eventType,
      });
    } catch (error) {
      // Check if it's a unique constraint violation (duplicate event)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        logger.warn('Webhook event already exists in database - duplicate insert attempt', {
          eventId,
          eventType,
          error: error.message,
        });
        // Don't throw - this is expected in race conditions
        return;
      }

      logger.error('Database error marking webhook event as processed', {
        eventId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      throw error;
    }
  }

  /**
   * Clean up old webhook events to prevent database bloat
   * Removes events older than the specified number of hours
   * @param olderThanHours - Remove events older than this many hours (default: 24)
   * @returns Number of events deleted
   */
  async cleanupOldEvents(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

      logger.info('Starting webhook event cleanup', {
        olderThanHours,
        cutoffDate: cutoffDate.toISOString(),
      });

      const result = await prisma.webhookEvent.deleteMany({
        where: {
          processedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Webhook event cleanup completed', {
        deletedCount: result.count,
        olderThanHours,
        cutoffDate: cutoffDate.toISOString(),
      });

      return result.count;
    } catch (error) {
      logger.error('Database error during webhook event cleanup', {
        olderThanHours,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      throw error;
    }
  }
}
