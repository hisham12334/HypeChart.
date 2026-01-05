import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export class PaymentController {

    // ---------------------------------------------------------
    // 1. CREATE ORDER
    // ---------------------------------------------------------
    async createOrder(req: Request, res: Response) {
        try {
            const { productId, variantId, quantity = 1 } = req.body;

            // Fetch Product & Brand
            const product = await prisma.product.findUnique({
                where: { id: productId },
                include: { user: true }
            });

            if (!product || !product.user) {
                return res.status(404).json({ success: false, error: "Product or Brand not found" });
            }

            // --- FIX 1 (Line 38): Convert Decimal to Number ---
            // Prisma decimals must be converted before doing math
            const basePrice = Number(product.basePrice);
            const amountInRupees = basePrice * quantity;
            const amountInPaise = Math.round(amountInRupees * 100); // Math.round avoids floating point errors

            const PLATFORM_FEE_PERCENT = 5;

            // Create Razorpay Order
            const options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: `rcpt_${Date.now().toString().slice(-8)}`,
                payment_capture: 1,

                notes: {
                    brand_id: product.userId,
                    // --- FIX 2 (Line 53): Handle Nullable Slug ---
                    // We provide a fallback string if slug is missing
                    brand_slug: product.user.slug || 'unknown-brand',
                    product_id: product.id,
                    product_name: product.name,
                    platform_fee_percent: PLATFORM_FEE_PERCENT.toString(),
                    type: "drop_purchase"
                }
            };

            const order = await razorpay.orders.create(options);

            res.json({
                success: true,
                orderId: order.id,
                amount: amountInPaise,
                currency: "INR",
                keyId: process.env.RAZORPAY_KEY_ID,
                brandName: product.user.brandName
            });

        } catch (error: any) {
            console.error("Payment Init Error:", error);
            res.status(500).json({ success: false, error: "Payment initialization failed" });
        }
    }

    // ---------------------------------------------------------
    // 2. VERIFY PAYMENT
    // ---------------------------------------------------------
    async verifyPayment(req: Request, res: Response) {
        try {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            } = req.body;

            // Verify Signature
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
                .update(body.toString())
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, error: "Invalid Signature" });
            }

            // Fetch Order to get the Notes
            const orderInfo = await razorpay.orders.fetch(razorpay_order_id);

            if (!orderInfo.notes) {
                throw new Error("Order missing critical audit notes");
            }

            // Parse Notes
            // We force 'as string' because we know we saved them as strings earlier
            const brandId = orderInfo.notes.brand_id as string;
            const grossAmount = Number(orderInfo.amount) / 100;
            const feePercent = Number(orderInfo.notes.platform_fee_percent) || 5;

            // Calculate Split
            const platformFee = (grossAmount * feePercent) / 100;
            const netAmount = grossAmount - platformFee;

            // --- FIX 3 (Line 122): Ensure 'npx prisma generate' was run ---
            await prisma.transaction.create({
                data: {
                    userId: brandId,
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id,
                    grossAmount: grossAmount,
                    platformFee: platformFee,
                    netAmount: netAmount,
                    status: "CAPTURED"
                }
            });

            res.json({ success: true, message: "Payment verified and ledger updated" });

        } catch (error) {
            console.error("Verification Error:", error);
            res.status(500).json({ success: false, error: "Payment verification failed" });
        }
    }
}