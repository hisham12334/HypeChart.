import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../services/product.service';
import { createOrderWithIdempotency } from '../services/order.service';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@brand-order-system/database';

const inventoryService = new InventoryService();
const productService = new ProductService();
const prisma = new PrismaClient();

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
  async createOrder(req: Request, res: Response) {
    try {
      const { items, amount } = req.body;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0 || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: items array and amount'
        });
      }

      // Generate unique session ID
      const idempotencyKey = (req as any).idempotencyKey;
      const sessionId = idempotencyKey
        ? `session_${idempotencyKey.substring(0, 16)}`
        : `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Generate Internal Order ID (The Key Requirement)
      const internalOrderId = crypto.randomUUID();

      // 1. Fetch Brand Info (From first item)
      // We accept that all items belong to one brand for now.
      const firstVariantId = items[0].variantId;
      const firstVariant = await prisma.variant.findUnique({
        where: { id: firstVariantId },
        include: {
          product: {
            include: { user: true }
          }
        }
      });

      if (!firstVariant || !firstVariant.product?.user) {
        return res.status(404).json({ success: false, error: "Brand/Product not found" });
      }

      const brand = firstVariant.product.user;
      const brandId = brand.id;
      const brandSlug = brand.slug || 'unknown-brand';

      // 2. Reserve Inventory for ALL items
      // We do this sequentially to keep it simple. If one fails, we should ideally rollback others,
      // but for MVP we'll catch and return error (orphan reservations expire in 10 mins anyway).
      for (const item of items) {
        const qty = item.quantity || 1;
        await inventoryService.reserveInventory(item.variantId, sessionId, qty);
      }

      // 3. Create Razorpay Order
      const PLATFORM_FEE_PERCENT = 5;
      const options = {
        amount: Math.round(amount * 100), // Convert to Paise
        currency: "INR",
        receipt: `receipt_${sessionId.substring(0, 20)}`,
        notes: {
          sessionId,
          internal_order_id: internalOrderId, // <--- ENFORCED
          brand_id: brandId,                 // <--- ENFORCED
          brand_slug: brandSlug,             // <--- ENFORCED
          platform_fee_percent: PLATFORM_FEE_PERCENT.toString(), // <--- Added Fee
          type: "drop_cart_purchase"
        }
      };

      const order = await razorpay.orders.create(options);

      const response = {
        success: true,
        orderId: order.id,
        sessionId,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID
      };

      res.json(response);

    } catch (error: any) {
      console.error("Order Creation Failed:", error);
      res.status(400).json({ success: false, error: error.message });
    }
  }


  // POST /api/checkout/verify
  async verifyPayment(req: Request, res: Response) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        customerDetails,
        orderItems
      } = req.body;

      const secret = process.env.RAZORPAY_KEY_SECRET!;

      // 1. Verify Signature
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid Signature' });
      }

      // 1.1 Fetch Razorpay Order to get the Audit Trail (Notes)
      // This ensures we use the exact same ID we reserved/generated earlier
      const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
      const internalOrderId = razorpayOrder.notes?.internal_order_id as string | undefined;
      const feePercent = Number(razorpayOrder.notes?.platform_fee_percent) || 5;
      const sessionId = razorpayOrder.notes?.sessionId as string;

      // 2. Fetch ALL Variants to Ensure Correct Data
      const variantIds = orderItems.map((i: any) => i.variantId);
      const variants = await prisma.variant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true }
      });

      if (variants.length !== variantIds.length) {
        // Some variants might be missing
        // For MVP, proceed with what we found or error?
        // Let's error to be safe
        return res.status(400).json({ success: false, error: 'One or more items invalid' });
      }

      // 3. Verify Merchant Consistency (Optional but recommended)
      // Check if all belong to same user
      const merchantUserId = variants[0].product.userId;
      const isConsistent = variants.every(v => v.product.userId === merchantUserId);

      if (!isConsistent) {
        // This is the edge case "Multi-Brand Cart".
        // For now, we unfortunately have to attribute it to the first one or fail.
        // Let's Log it and proceed with first merchant as the 'Order Owner'
        console.warn("Mixed Merchant Order - Attributing to " + merchantUserId);
      }


      // 4. Use OrderService for Atomic Creation
      const orderData = {
        merchantUserId,
        sessionId: sessionId || "unknown_session",
        customerDetails,

        orderItems,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        internalOrderId: internalOrderId || `internal_${razorpay_order_id}`,
        feePercent,
        variants
      };

      const result = await createOrderWithIdempotency(orderData, razorpay_order_id);
      return res.json(result);

    } catch (error: any) {
      console.error("Verification Failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

}