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

            res.json({ success: true, product });

        } catch (error) {
            console.error("Drop Link Error:", error);
            res.status(500).json({ success: false, error: "Could not load drop" });
        }
    }
}