import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class AnalyticsService {

    async getDashboardStats(userId: string) {
        // 1. Total Revenue & Order Count
        const revenueAgg = await prisma.order.aggregate({
            where: {
                userId,
                status: { not: 'cancelled' },
                paymentStatus: 'paid'
            },
            _sum: { total: true },
            _count: { id: true }
        });

        // 2. Recent Sales (Last 7 Days) for the Graph
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentOrders = await prisma.order.findMany({
            where: {
                userId,
                createdAt: { gte: sevenDaysAgo },
                paymentStatus: 'paid'
            },
            select: {
                createdAt: true,
                total: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by Date (Simple implementation)
        const salesByDate: Record<string, number> = {};
        recentOrders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            salesByDate[date] = (salesByDate[date] || 0) + Number(order.total);
        });

        const graphData = Object.entries(salesByDate).map(([date, total]) => ({
            name: date,
            total: total
        }));

        // 3. Low Stock Products
        const lowStockProducts = await prisma.variant.findMany({
            where: {
                product: { userId },
                inventoryCount: { lte: 10 } // Alert if less than 10 items left
            },
            include: { product: true },
            take: 5
        });

        return {
            totalRevenue: revenueAgg._sum.total || 0,
            totalOrders: revenueAgg._count.id || 0,
            graphData,
            lowStockProducts
        };
    }
}