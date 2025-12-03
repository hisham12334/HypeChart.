import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../services/product.service';

const inventoryService = new InventoryService();
const productService = new ProductService();

export class CheckoutController {

  // GET /api/checkout/products/:slug
  // Public endpoint to get product details for checkout
  async getProduct(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const product = await productService.getProductBySlug(slug);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate real-time available stock for each variant
      const variantsWithStock = product.variants.map((v: any) => ({
        ...v,
        availableCount: v.inventoryCount - v.reservedCount
      }));

      res.json({ 
        success: true, 
        data: { ...product, variants: variantsWithStock } 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/checkout/reserve
  async reserve(req: Request, res: Response) {
    try {
      const { variantId, sessionId, quantity } = req.body;
      
      const result = await inventoryService.reserveInventory(variantId, sessionId, quantity || 1);
      
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}