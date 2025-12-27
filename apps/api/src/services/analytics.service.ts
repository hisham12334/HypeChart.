import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class AnalyticsService {

    async getDashboardStats(userId: string) {
        // 1. Basic Stats (Revenue, Orders)
        const revenueAgg = await prisma.order.aggregate({
            where: { userId, status: { not: 'cancelled' }, paymentStatus: 'paid' },
            _sum: { total: true },
            _count: { id: true }
        });

        const totalOrders = revenueAgg._count.id || 0;
        const totalRevenue = Number(revenueAgg._sum.total || 0);
        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        // 2. Sales Graph (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentOrders = await prisma.order.findMany({
            where: { userId, createdAt: { gte: sevenDaysAgo }, paymentStatus: 'paid' },
            select: { createdAt: true, total: true },
            orderBy: { createdAt: 'asc' }
        });

        const salesByDate: Record<string, number> = {};
        recentOrders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            salesByDate[date] = (salesByDate[date] || 0) + Number(order.total);
        });

        const graphData = Object.entries(salesByDate).map(([date, total]) => ({
            name: date,
            total: total
        }));

        // 3. Low Stock Alerts
        const lowStockProducts = await prisma.variant.findMany({
            where: { product: { userId }, inventoryCount: { lte: 5 } },
            include: { product: true },
            take: 5
        });

        // --- NEW METRICS ---

        // 4. Sales by Size (Grouping OrderItems by variantName)
        // Note: We need to filter by orders belonging to this user
        const sizeGroups = await prisma.order.findMany({
            where: { userId, paymentStatus: 'paid' },
            select: {
                items: true // This contains variantName
            }
        });

        const sizeCounts: Record<string, number> = {};
        sizeGroups.forEach(order => {
            // items is a JSON field in your schema, so we cast it
            const items = order.items as any[];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const size = item.variantName || 'One Size';
                    sizeCounts[size] = (sizeCounts[size] || 0) + (item.quantity || 1);
                });
            }
        });

        const salesBySize = Object.entries(sizeCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort highest first

        // 5. Top Cities (Grouping Addresses)
        const cityGroups = await prisma.address.groupBy({
            by: ['city'],
            where: {
                orders: { some: { userId, paymentStatus: 'paid' } }
            },
            _count: { city: true },
            orderBy: { _count: { city: 'desc' } },
            take: 5
        });

        const topCities = cityGroups.map(c => ({
            city: c.city,
            count: c._count.city
        }));

        // 6. Top Products by Revenue
        const productsRaw = await prisma.order.findMany({
            where: { userId, paymentStatus: 'paid' },
            select: { items: true }
        });

        const productPerformance: Record<string, { name: string, revenue: number, qty: number }> = {};

        productsRaw.forEach(order => {
            const items = order.items as any[];
            if (Array.isArray(items)) {
                items.forEach(item => {
                    const pid = item.productId;
                    if (!productPerformance[pid]) {
                        productPerformance[pid] = { name: item.productName, revenue: 0, qty: 0 };
                    }
                    productPerformance[pid].revenue += (item.price * item.quantity);
                    productPerformance[pid].qty += item.quantity;
                });
            }
        });

        const topProducts = Object.values(productPerformance)
            .sort((a, b) => b.revenue - a.revenue)
            .take(5);

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            graphData,
            lowStockProducts,
            salesBySize,
            topCities,
            topProducts
        };
    }
}

// Helper for 'take' on array (if not available in env)
declare global {
    interface Array<T> {
        take(n: number): Array<T>;
    }
}
// Polyfill for simple array take if needed, or just use slice
Object.defineProperty(Array.prototype, 'take', {
    value: function (n: number) { return this.slice(0, n); }
});