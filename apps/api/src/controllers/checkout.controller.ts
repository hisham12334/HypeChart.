import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { ProductService } from '../services/product.service';
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

      // 2. Fetch Product Data to link the Order to the correct Merchant (User)
      // We assume all items in a cart belong to the same merchant for this MVP
      const firstVariantId = orderItems[0].variantId;
      const variant = await prisma.variant.findUnique({
        where: { id: firstVariantId },
        include: { product: true }
      });

      if (!variant) {
        return res.status(400).json({ success: false, error: 'Variant not found' });
      }

      const merchantUserId = variant.product.userId;

      // 3. Use a Transaction to save everything safely
      const order = await prisma.$transaction(async (tx) => {

        // A. Find or Create Customer (CRM)
        let customer = await tx.customer.findFirst({
          where: {
            userId: merchantUserId,
            phone: customerDetails.phone
          }
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              userId: merchantUserId,
              name: customerDetails.name,
              phone: customerDetails.phone,
              email: customerDetails.email || null,
              totalSpent: 0,
              totalOrders: 0
            }
          });
        }

        // B. Create Address
        const address = await tx.address.create({
          data: {
            customerId: customer.id,
            addressLine1: customerDetails.address,
            city: customerDetails.city,
            state: customerDetails.state,
            pincode: customerDetails.pincode,
            isDefault: true
          }
        });

        // C. Create the Order with Relations
        const newOrder = await tx.order.create({
          data: {
            userId: merchantUserId,
            customerId: customer.id,
            addressId: address.id,
            orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,

            // Financials
            subtotal: parseFloat(customerDetails.amount),
            shippingFee: 0, // Logic for shipping can be added here
            total: parseFloat(customerDetails.amount),

            // Status Enums (Matches your Schema)
            paymentStatus: 'paid',
            status: 'paid', // Or 'processing'
            productDropDate: variant.product.productDropDate,

            // Create Order Items
            items: {
              create: orderItems.map((item: any) => ({
                productId: variant.productId,
                variantId: item.variantId,
                productName: variant.product.name,
                variantName: variant.name,
                price: variant.product.basePrice, // Ideally fetch real price per item
                quantity: item.quantity
              }))
            }
          }
        });

        // D. Update Customer Stats
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: parseFloat(customerDetails.amount) },
            lastOrderAt: new Date()
          }
        });

        return newOrder;
      });

      return res.json({ success: true, orderId: order.id });

    } catch (error: any) {
      console.error("Verification Failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

}