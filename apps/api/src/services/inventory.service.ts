import { PrismaClient } from '@brand-order-system/database';
import Redis from 'ioredis';

const prisma = new PrismaClient();
// Connect to the Redis container
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class InventoryService {
  
  // Reserve inventory for a customer (10 min lock)
  async reserveInventory(variantId: string, sessionId: string, quantity: number) {
    const LOCK_KEY = `lock:variant:${variantId}`;
    
    // 1. Acquire Lock (Prevent Race Conditions)
    // We try to set a key that expires in 5 seconds. If it exists, someone else is buying.
    const acquired = await redis.set(LOCK_KEY, 'locked', 'EX', 5, 'NX');
    if (!acquired) {
      throw new Error('System busy, please try again');
    }

    try {
      // 2. Check Database Inventory
      const variant = await prisma.variant.findUnique({
        where: { id: variantId }
      });

      if (!variant) throw new Error('Variant not found');

      // Available = Total - Reserved
      const available = variant.inventoryCount - variant.reservedCount;

      if (available < quantity) {
        throw new Error('Out of stock');
      }

      // 3. Create Reservation in DB
      const reservation = await prisma.cartReservation.create({
        data: {
          variantId,
          sessionId,
          quantity,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
        }
      });

      // 4. Update Variant Reserved Count
      await prisma.variant.update({
        where: { id: variantId },
        data: { reservedCount: { increment: quantity } }
      });

      return { success: true, reservationId: reservation.id, expiresAt: reservation.expiresAt };

    } finally {
      // 5. Release Lock
      await redis.del(LOCK_KEY);
    }
  }

  // Release inventory (if payment fails or timeout)
  async releaseReservation(sessionId: string) {
    const reservation = await prisma.cartReservation.findFirst({
      where: { sessionId }
    });

    if (reservation) {
      await prisma.$transaction([
        // Decrease reserved count
        prisma.variant.update({
          where: { id: reservation.variantId },
          data: { reservedCount: { decrement: reservation.quantity } }
        }),
        // Delete reservation record
        prisma.cartReservation.delete({
          where: { id: reservation.id }
        })
      ]);
    }
  }
}