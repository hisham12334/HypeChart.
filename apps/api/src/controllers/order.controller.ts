import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class OrderController {

    // GET /api/orders
    async list(req: Request, res: Response) {
        try {
            const orders = await prisma.order.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: {
                    customer: true, // Get Customer Name/Phone
                    address: true,  // Get Shipping Address
                    items: true     // Get Product Items
                }
            });

            res.json({ success: true, data: orders });
        } catch (error: any) {
            console.error("Fetch orders error:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}