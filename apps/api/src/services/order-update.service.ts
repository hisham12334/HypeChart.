import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface OrderUpdateResult {
  success: boolean;
  orderNumber?: string;
  alreadyPaid: boolean;
  orderNotFound: boolean;
}

export class OrderUpdateService {
  /**
   * Mark an order as paid using the Razorpay order ID and payment ID
   * This method is idempotent and handles race conditions
   * 
   * @param razorpayOrderId - The Razorpay order ID to find the order
   * @param razorpayPaymentId - The Razorpay payment ID to store
   * @returns OrderUpdateResult with success status and details
   */
  async markOrderAsPaid(
    razorpayOrderId: string,
    razorpayPaymentId: string
  ): Promise<OrderUpdateResult> {
    try {
      logger.info('Attempting to mark order as paid', {
        razorpayOrderId,
        razorpayPaymentId,
      });

      return await prisma.$transaction(async (tx) => {
        // Query order by razorpayOrderId
        let order;
        try {
          order = await tx.order.findFirst({
            where: { razorpayOrderId },
            select: {
              id: true,
              orderNumber: true,
              paymentStatus: true,
              razorpayPaymentId: true,
            }
          });
        } catch (error) {
          logger.error('Database error querying order by razorpayOrderId', {
            razorpayOrderId,
            razorpayPaymentId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          });
          throw error;
        }

        // Handle order not found scenario
        if (!order) {
          logger.warn('Order not found for razorpayOrderId', {
            razorpayOrderId,
            razorpayPaymentId,
          });
          return {
            success: false,
            orderNotFound: true,
            alreadyPaid: false
          };
        }

        // Handle already paid scenario (idempotency)
        if (order.paymentStatus === 'paid') {
          logger.info('Order already marked as paid - idempotent check', {
            orderNumber: order.orderNumber,
            razorpayOrderId,
            razorpayPaymentId,
            existingPaymentId: order.razorpayPaymentId,
          });
          return {
            success: true,
            orderNumber: order.orderNumber,
            alreadyPaid: true,
            orderNotFound: false
          };
        }

        // Log current order status before update
        logger.info('Updating order payment status', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          currentStatus: order.paymentStatus,
          newStatus: 'paid',
          razorpayOrderId,
          razorpayPaymentId,
        });

        // Update order with payment details
        let updatedOrder;
        try {
          updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'paid',
              razorpayPaymentId,
              paidAt: new Date()
            },
            select: {
              orderNumber: true,
              paymentStatus: true,
              paidAt: true,
            }
          });
        } catch (error) {
          logger.error('Database error updating order payment status', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            razorpayOrderId,
            razorpayPaymentId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          });
          throw error;
        }

        logger.info('Order payment status updated successfully', {
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: updatedOrder.paymentStatus,
          paidAt: updatedOrder.paidAt,
          razorpayOrderId,
          razorpayPaymentId,
        });

        return {
          success: true,
          orderNumber: updatedOrder.orderNumber,
          alreadyPaid: false,
          orderNotFound: false
        };
      });
    } catch (error) {
      logger.error('Transaction failed in markOrderAsPaid', {
        razorpayOrderId,
        razorpayPaymentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
