import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class StoreController {

    // 1. (Optional) Get Brand Info - We keep this just in case
    async getStoreBySlug(req: Request, res: Response) {
        // ... (Keep the previous code here if you want, or delete it)
    }

    // 2. THE DROP LINK ENGINE
    // GET /api/store/product/:productId
    async getProductById(req: Request, res: Response) {
        try {
            const { productId } = req.params; // This might be "haqq-tee" or "bc65..."

            const product = await prisma.product.findFirst({
                where: {
                    OR: [
                        { id: productId },          // Check if it's an ID
                        { checkoutSlug: productId } // Check if it's a Checkout Slug
                    ]
                },
                include: {
                    variants: true,
                    user: {
                        select: { brandName: true, slug: true, logoUrl: true }
                    }
                }
            });

            if (!product) {
                return res.status(404).json({ success: false, error: "Product not found" });
            }

            // Calculate real-time available stock
            const variantsWithStock = product.variants.map((v: any) => ({
                ...v,
                availableCount: v.inventoryCount - v.reservedCount
            }));

            res.json({ success: true, product: { ...product, variants: variantsWithStock } });

        } catch (error) {
            console.error("Drop Link Error:", error);
            res.status(500).json({ success: false, error: "Could not load drop" });
        }
    }

    // 3. Stock Check for Cart Validation
    // POST /api/store/stock
    async checkStock(req: Request, res: Response) {
        try {
            const { items } = req.body; // Expects [{ variantId, quantity }]

            if (!items || !Array.isArray(items)) {
                return res.status(400).json({ success: false, error: "Invalid items format" });
            }

            const variantIds = items.map((i: any) => i.variantId);
            const variants = await prisma.variant.findMany({
                where: { id: { in: variantIds } }
            });

            const stockMap = new Map();
            variants.forEach(v => {
                stockMap.set(v.id, v.inventoryCount - v.reservedCount);
            });

            const results = items.map((item: any) => {
                const available = stockMap.get(item.variantId) || 0;
                return {
                    variantId: item.variantId,
                    requested: item.quantity,
                    available: available,
                    inStock: available >= item.quantity
                };
            });

            const allInStock = results.every((r: any) => r.inStock);

            res.json({
                success: true,
                allInStock,
                results
            });

        } catch (error) {
            console.error("Stock Check Error:", error);
            res.status(500).json({ success: false, error: "Could not validate stock" });
        }
    }
}