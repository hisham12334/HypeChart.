import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class OrderController {

    // GET /api/orders
    async list(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const orders = await prisma.order.findMany({
                where: {
                    // In a real multi-tenant app, filter by userId/brand
                    // For this MVP, if the user owns the products in the order, show it
                    // OR simply show all orders if this is a single-tenant instance
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });

            res.json({ success: true, data: orders });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}