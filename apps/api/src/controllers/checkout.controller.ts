import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../services/product.service';
import Razorpay from 'razorpay';

const inventoryService = new InventoryService();
const productService = new ProductService();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export class CheckoutController {

  // GET /api/checkout/products/:slug
  async getProduct(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const product = await productService.getProductBySlug(slug);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate real-time available stock
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

  // POST /api/checkout/create-order
  // 1. Reserve Inventory -> 2. Create Razorpay Order
  // Protected by idempotency middleware to prevent duplicate charges
  async createOrder(req: Request, res: Response) {
    try {
      const { variantId, quantity, amount } = req.body;

      // Validate required fields
      if (!variantId || !amount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: variantId and amount' 
        });
      }

      // Validate quantity
      const qty = quantity || 1;
      if (qty < 1 || qty > 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'Quantity must be between 1 and 10' 
        });
      }

      // Validate amount (must be positive)
      if (amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Amount must be greater than 0' 
        });
      }

      // Generate unique session ID (include idempotency key if available)
      const idempotencyKey = (req as any).idempotencyKey;
      const sessionId = idempotencyKey 
        ? `session_${idempotencyKey.substring(0, 16)}`
        : `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 1. Reserve Inventory (10 mins)
      await inventoryService.reserveInventory(variantId, sessionId, qty);

      // 2. Create Razorpay Order
      const options = {
        amount: amount * 100, // Convert to Paise (Required by Razorpay)
        currency: "INR",
        receipt: `receipt_${sessionId.substring(0, 20)}`,
        notes: {
          variantId,
          sessionId, // We save this to link payment back to reservation later
          quantity: qty,
          idempotencyKey: idempotencyKey || 'none'
        }
      };

      const order = await razorpay.orders.create(options);

      const response = { 
        success: true, 
        orderId: order.id, 
        sessionId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID // Send public key to frontend
      };

      res.json(response);

    } catch (error: any) {
      console.error("Order Creation Failed:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }
}