import { PrismaClient } from '@brand-order-system/database';
import Redis from 'ioredis';

const prisma = new PrismaClient();
// Connect to the Redis container
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class InventoryService {

  // Reserve inventory for a customer (10 min lock)
  async reserveInventory(variantId: string, sessionId: string, quantity: number) {
    const LOCK_KEY = `lock:variant:${variantId}`;

    // 1. Acquire Redis Lock (First line of defense for high concurrency)
    const acquired = await redis.set(LOCK_KEY, 'locked', 'EX', 5, 'NX');
    if (!acquired) {
      throw new Error('System busy, please try again');
    }

    try {
      // 2. Perform Atomic Transaction
      // We wrap the DB logic in a transaction to ensure consistency
      return await prisma.$transaction(async (tx) => {

        // A. Fetch current max inventory to perform the check
        const variant = await tx.variant.findUnique({
          where: { id: variantId }
        });

        if (!variant) throw new Error('Variant not found');

        // B. ATOMIC UPDATE (The Critical Fix)
        // Instead of calculating in JS, we tell the DB: 
        // "Only increment reservedCount IF it won't exceed inventoryCount"
        const updateResult = await tx.variant.updateMany({
          where: {
            id: variantId,
            // This condition enforces the stock limit at the Database level
            reservedCount: { lte: variant.inventoryCount - quantity }
          },
          data: {
            reservedCount: { increment: quantity }
          }
        });

        // If count is 0, it means the 'where' condition failed (Stock is full)
        if (updateResult.count === 0) {
          throw new Error('Out of stock');
        }

        // C. Create Reservation in DB
        const reservation = await tx.cartReservation.create({
          data: {
            variantId,
            sessionId,
            quantity,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
          }
        });

        return {
          success: true,
          reservationId: reservation.id,
          expiresAt: reservation.expiresAt
        };
      });

    } finally {
      // 3. Release Redis Lock
      await redis.del(LOCK_KEY);
    }
  }

  // Release inventory (if payment fails or timeout)
  async releaseReservation(sessionId: string) {
    // 1. Find the reservation
    const reservation = await prisma.cartReservation.findFirst({
      where: { sessionId }
    });

    if (reservation) {
      // 2. Atomic Cleanup
      await prisma.$transaction(async (tx) => {
        // Decrease reserved count
        await tx.variant.update({
          where: { id: reservation.variantId },
          data: { reservedCount: { decrement: reservation.quantity } }
        });

        // Delete reservation record
        await tx.cartReservation.delete({
          where: { id: reservation.id }
        });
      });
    }
  }
}