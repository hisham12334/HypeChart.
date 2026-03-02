import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../services/product.service';
import { createOrderWithIdempotency } from '../services/order.service';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@brand-order-system/database';
import { decrypt, isEncrypted } from '../utils/crypto.util';

const inventoryService = new InventoryService();
const productService = new ProductService();
const prisma = new PrismaClient();

// Initialize Default Platform Razorpay
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

      if (!items || !Array.isArray(items) || items.length === 0 || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: items array and amount'
        });
      }

      const idempotencyKey = (req as any).idempotencyKey;
      const sessionId = idempotencyKey
        ? `session_${idempotencyKey.substring(0, 16)}`
        : `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const internalOrderId = crypto.randomUUID();

      // 1. Fetch Brand Info (From first item)
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
      for (const item of items) {
        const qty = item.quantity || 1;
        await inventoryService.reserveInventory(item.variantId, sessionId, qty);
      }

      // 3. Create Razorpay Order
      const amountInPaise = Math.round(amount * 100);

      // --- 🔪 SURGERY PHASE 3: DYNAMIC PAYMENT ROUTING ---
      let activeRazorpayInstance = razorpay;
      let activeKeyId = process.env.RAZORPAY_KEY_ID;
      let platformFeePercent = 0.7;
      let transfersConfig: any = undefined;

      if (brand.plan === "PRO" && brand.razorpayKeyId && brand.razorpayKeySecret) {
        // 🚀 PRO TIER: Bring Your Own Gateway (0% Platform Fee)
        // Decrypt the stored AES-256-GCM ciphertext back to the plain secret
        const plainSecret = isEncrypted(brand.razorpayKeySecret)
          ? decrypt(brand.razorpayKeySecret)
          : brand.razorpayKeySecret; // Backwards compat for any un-migrated rows

        activeRazorpayInstance = new Razorpay({
          key_id: brand.razorpayKeyId,
          key_secret: plainSecret,
        });
        activeKeyId = brand.razorpayKeyId;
        platformFeePercent = 0;
      } else {
        // 🏦 STARTER TIER: Route Split (0.7% Platform Fee)
        platformFeePercent = 0.7;

        if (brand.razorpayLinkedAccountId) {
          const brandSharePaise = Math.floor(amountInPaise * (1 - (platformFeePercent / 100)));
          transfersConfig = [
            {
              account: brand.razorpayLinkedAccountId,
              amount: brandSharePaise,
              currency: "INR",
              notes: {
                brand_id: brand.id,
                platform_fee: `${platformFeePercent}%`
              },
              on_hold: false
            }
          ];
        }
      }
      // ---------------------------------------------------

      const options: any = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${sessionId.substring(0, 20)}`,
        notes: {
          sessionId,
          internal_order_id: internalOrderId,
          brand_id: brandId,
          brand_slug: brandSlug,
          platform_fee_percent: platformFeePercent.toString(),
          type: "drop_cart_purchase"
        }
      };

      // Attach transfers if it's a Starter Tier linked account
      if (transfersConfig) {
        options.transfers = transfersConfig;
      }

      // 👀 WATCH THIS IN YOUR TERMINAL!
      console.log("💰 RAZORPAY ORDER PAYLOAD:", JSON.stringify(options, null, 2));

      const order = await activeRazorpayInstance.orders.create(options);

      const response = {
        success: true,
        orderId: order.id,
        sessionId,
        amount: order.amount,
        currency: order.currency,
        keyId: activeKeyId // Ensure the correct key is passed to checkout UI
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
        brandId,          // ✅ BYOG FIX: sent from frontend so we know whose keys to use
        customerDetails,
        orderItems
      } = req.body;

      // --- ✅ BYOG FIX: Determine which Razorpay instance & secret to use ---
      // Default to platform keys (Starter tier / platform orders)
      let secretToUse = process.env.RAZORPAY_KEY_SECRET!;
      let activeRazorpay = razorpay;

      if (brandId) {
        const brand = await prisma.user.findUnique({ where: { id: brandId } });
        if (brand?.plan === 'PRO' && brand?.razorpayKeySecret && brand?.razorpayKeyId) {
          // Decrypt the stored AES-256-GCM ciphertext before using for HMAC + API calls
          const plainSecret = isEncrypted(brand.razorpayKeySecret)
            ? decrypt(brand.razorpayKeySecret)
            : brand.razorpayKeySecret; // Backwards compat for un-migrated rows

          secretToUse = plainSecret;
          activeRazorpay = new Razorpay({
            key_id: brand.razorpayKeyId,
            key_secret: plainSecret,
          });
        }
      }
      // ----------------------------------------------------------------------

      // 1. Verify Signature using the correct secret (platform or brand)
      const generated_signature = crypto
        .createHmac('sha256', secretToUse)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid Signature' });
      }

      // 1.1 Fetch Razorpay Order notes using the correct instance (platform or brand)
      const razorpayOrder = await activeRazorpay.orders.fetch(razorpay_order_id);
      const internalOrderId = razorpayOrder.notes?.internal_order_id as string | undefined;
      const feePercent = Number(razorpayOrder.notes?.platform_fee_percent) || 0;
      const sessionId = razorpayOrder.notes?.sessionId as string;

      // 2. Fetch ALL Variants to Ensure Correct Data
      const variantIds = orderItems.map((i: any) => i.variantId);
      const variants = await prisma.variant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true }
      });

      if (variants.length !== variantIds.length) {
        return res.status(400).json({ success: false, error: 'One or more items invalid' });
      }

      // 3. Verify Merchant Consistency & Calculate Real Value
      const merchantUserId = variants[0].product.userId;

      // --- 🚨 SECURITY FIX 1: Prevent Cross-Merchant Spoofing ---
      // Ensure the items belong to the exact brand that was paid for
      const orderBrandId = razorpayOrder.notes?.brand_id as string | undefined;
      if (orderBrandId && merchantUserId !== orderBrandId) {
        throw new Error("Security Error: Cart items do not belong to the paid merchant.");
      }
      if (brandId && merchantUserId !== brandId) {
        throw new Error("Security Error: Payment verified against a different brand's API keys.");
      }

      // --- 🚨 SECURITY FIX 2: Prevent Price Alteration Attacks ---
      // Calculate exact cart total from the DB, ignoring what the frontend claims
      let calculatedTotalRupees = 0;
      for (const item of orderItems) {
        const variant = variants.find((v: any) => v.id === item.variantId);
        if (!variant) continue;
        const variantPrice = Number((variant as any).price) || 0;
        const basePrice = Number(variant.product.basePrice);
        const adjustment = Number(variant.priceAdjustment || 0);

        // Resolve absolute variant price vs legacy basePrice + adjustment
        const effectivePrice = variantPrice > 0 ? variantPrice : (basePrice + adjustment);

        calculatedTotalRupees += effectivePrice * (item.quantity || 1);
      }

      // --- Shipping Calculation (Must Match Frontend 1:1) ---
      const shippingFee = calculatedTotalRupees < 1000 ? 99 : 0;
      calculatedTotalRupees += shippingFee;

      const expectedAmountPaise = Math.round(calculatedTotalRupees * 100);

      // Tolerance of 100 paise (1 rupee) max difference for any floating point weirdness
      if (Math.abs(expectedAmountPaise - Number(razorpayOrder.amount)) > 100) {
        throw new Error(`Security Error: Amount mismatch. Cart value is ${expectedAmountPaise}p but payment was for ${razorpayOrder.amount}p`);
      }

      // Secure the customer details by overriding the untrusted frontend amount
      const safeCustomerDetails = {
        ...customerDetails,
        amount: calculatedTotalRupees.toString(),
      };

      const isConsistent = variants.every(v => v.product.userId === merchantUserId);

      if (!isConsistent) {
        console.warn("Mixed Merchant Order - Attributing to " + merchantUserId);
      }

      // 4. Use OrderService for Atomic Creation
      const orderData = {
        merchantUserId,
        sessionId: sessionId || "unknown_session",
        customerDetails: safeCustomerDetails,
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