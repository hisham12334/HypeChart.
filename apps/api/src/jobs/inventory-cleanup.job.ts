import cron from 'node-cron';
import { PrismaClient } from '@brand-order-system/database';
import { logger } from '../utils/logger'; // Assuming you have a logger, or use console

const prisma = new PrismaClient();

export const startInventoryCleanupJob = () => {
    // Run every 5 minutes: "*/5 * * * *"
    cron.schedule('*/5 * * * *', async () => {
        logger.info('🧹 Running Inventory Cleanup Job...');

        try {
            const now = new Date();

            // 1. Find all expired reservations
            const expiredReservations = await prisma.cartReservation.findMany({
                where: {
                    expiresAt: { lt: now } // "Less than now" means expired
                }
            });

            if (expiredReservations.length === 0) {
                return; // Nothing to clean
            }

            logger.info(`Found ${expiredReservations.length} expired reservations.`);

            // 2. Process cleanup (Using a Transaction for safety)
            await prisma.$transaction(async (tx) => {
                for (const res of expiredReservations) {
                    // A. Release the stock back to the variant
                    await tx.variant.update({
                        where: { id: res.variantId },
                        data: {
                            reservedCount: { decrement: res.quantity }
                        }
                    });

                    // B. Delete the reservation record
                    await tx.cartReservation.delete({
                        where: { id: res.id }
                    });
                }
            });

            logger.info(`✅ Successfully released stock for ${expiredReservations.length} items.`);

        } catch (error) {
            logger.error('❌ Inventory Cleanup Failed:', { error });
        }
    });
};