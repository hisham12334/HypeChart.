import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@brand-order-system/database';
import { decrypt, isEncrypted } from '../utils/crypto.util';
import { calculateSettlementEta } from '../utils/date.util';

const prisma = new PrismaClient();

// Initialize Default Platform Razorpay
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

            const brand = product.user;

            // --- FIX 1: Convert Decimal to Number ---
            let effectivePrice = Number(product.basePrice);

            // If buying a specific variant, use its absolute price or fallback to base + adjustment
            if (variantId) {
                const variant = await prisma.variant.findUnique({ where: { id: variantId } });
                if (variant) {
                    const variantPrice = Number(variant.price) || 0;
                    const adjustment = Number(variant.priceAdjustment) || 0;
                    effectivePrice = variantPrice > 0 ? variantPrice : (effectivePrice + adjustment);
                }
            }

            const amountInRupees = effectivePrice * quantity;
            const amountInPaise = Math.round(amountInRupees * 100);

            let platformFeePercent = 0.7; // Default fallback — Hypechart platform cut

            // Create Base Razorpay Order Options
            const options: any = {
                amount: amountInPaise,
                currency: "INR",
                receipt: `rcpt_${Date.now().toString().slice(-8)}`,
                payment_capture: 1,
                notes: {
                    brand_id: product.userId,
                    // --- FIX 2: Handle Nullable Slug ---
                    brand_slug: brand.slug || 'unknown-brand',
                    product_id: product.id,
                    product_name: product.name,
                    platform_fee_percent: platformFeePercent.toString(),
                    type: "drop_purchase"
                }
            };

            // --- 🔪 SURGERY PHASE 3: CHECKOUT ROUTING ---
            let activeRazorpayInstance = razorpay;
            let activeKeyId = process.env.RAZORPAY_KEY_ID;

            if (brand.plan === "PRO" && brand.razorpayKeyId && brand.razorpayKeySecret) {
                // 🚀 PRO TIER: Bring Your Own Gateway (0% Platform Fee)
                activeRazorpayInstance = new Razorpay({
                    key_id: brand.razorpayKeyId,
                    key_secret: brand.razorpayKeySecret,
                });
                activeKeyId = brand.razorpayKeyId;
                options.notes.platform_fee_percent = "0"; // Override fee to 0%
            } else {
                // 🏦 STARTER TIER: Route Split (3% Platform Fee)
                platformFeePercent = 0.7;
                options.notes.platform_fee_percent = platformFeePercent.toString();

                if (brand.razorpayLinkedAccountId) {
                    const brandSharePaise = Math.floor(amountInPaise * (1 - (platformFeePercent / 100)));
                    options.transfers = [
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
            // --------------------------------------------

            // Create Order using the dynamically selected instance
            const order = await activeRazorpayInstance.orders.create(options);

            res.json({
                success: true,
                orderId: order.id,
                amount: amountInPaise,
                currency: "INR",
                keyId: activeKeyId, // Send the correct Key ID to frontend checkout
                brandName: brand.brandName
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
                razorpay_signature,
                brandId // 🔪 Required from frontend to determine routing
            } = req.body;

            // --- 🔪 SURGERY PHASE 4: DYNAMIC VERIFICATION ---
            let secretToUse = process.env.RAZORPAY_KEY_SECRET || '';
            let activeRazorpayInstance = razorpay;

            // If a brandId is provided, fetch it to check if they are PRO
            if (brandId) {
                const brand = await prisma.user.findUnique({ where: { id: brandId } });
                if (brand?.plan === "PRO" && brand?.razorpayKeySecret && brand?.razorpayKeyId) {
                    // Decrypt before using (stored as AES-256-GCM encrypted)
                    const plainSecret = isEncrypted(brand.razorpayKeySecret)
                        ? decrypt(brand.razorpayKeySecret)
                        : brand.razorpayKeySecret; // Backwards compat for un-migrated rows
                    secretToUse = plainSecret;
                    activeRazorpayInstance = new Razorpay({
                        key_id: brand.razorpayKeyId,
                        key_secret: plainSecret
                    });
                }
            }
            // ------------------------------------------------

            // Verify Signature using the dynamically selected secret
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', secretToUse)
                .update(body.toString())
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, error: "Invalid Signature" });
            }

            // Fetch Order Notes using the dynamically selected instance
            const orderInfo = await activeRazorpayInstance.orders.fetch(razorpay_order_id);

            if (!orderInfo.notes) {
                throw new Error("Order missing critical audit notes");
            }

            const type = orderInfo.notes?.type;

            // SPECIAL CASE: Subscription Activation
            if (type === 'subscription_activation') {
                console.log(`✅ Subscription Payment Verified: ${razorpay_order_id}`);

                const subscribingUserId = orderInfo.notes?.userId as string;
                if (subscribingUserId && subscribingUserId !== 'unknown') {
                    // Automatically upgrade user to PRO
                    await prisma.user.update({
                        where: { id: subscribingUserId },
                        data: { plan: "PRO" }
                    });
                    console.log(`🚀 Upgraded User ${subscribingUserId} to PRO`);
                } else {
                    console.warn(`⚠️ Subscription paid, but no userId found in order notes! order: ${razorpay_order_id}`);
                }

                return res.json({ success: true, message: "Subscription verified" });
            }

            const resolvedBrandId = orderInfo.notes?.brand_id as string;

            if (!resolvedBrandId) {
                throw new Error("Security Error: Razorpay order is missing the securely bound brand_id in its notes.");
            }

            const grossAmount = Number(orderInfo.amount) / 100;
            const feePercent = Number(orderInfo.notes?.platform_fee_percent) || 0.7;

            // ── Fee split ───────────────────────────────────────────────────
            // Razorpay always deducts 2% from gross before settling to us.
            // Platform fee is NOT deducted — brand receives gross minus razorpay fee only.
            const RAZORPAY_FEE_PERCENT = 2;
            const razorpayFee = parseFloat(((grossAmount * RAZORPAY_FEE_PERCENT) / 100).toFixed(2));
            const platformFee = 0; // No platform fee charged
            const netAmount = parseFloat((grossAmount - razorpayFee).toFixed(2));
            // ────────────────────────────────────────────────────────────────

            // settlementEta = capturedAt + 2 business days (excluding weekends)
            // (cron job will overwrite with actual date once settlement arrives)
            const capturedAt = new Date();
            const settlementEta = calculateSettlementEta(capturedAt);

            // Look up the DB Order by razorpay order ID to link it
            const order = await prisma.order.findUnique({
                where: { razorpayOrderId: razorpay_order_id },
                select: { id: true },
            });

            // --- Record transaction with enriched fields ---
            await prisma.transaction.upsert({
                where: { razorpayOrderId: razorpay_order_id },
                update: {
                    razorpayPaymentId: razorpay_payment_id,
                    status: 'CAPTURED',
                },
                create: {
                    userId: resolvedBrandId,
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id,
                    grossAmount: grossAmount,
                    razorpayFee: razorpayFee,
                    platformFee: platformFee,
                    netAmount: netAmount,
                    status: 'CAPTURED',
                    capturedAt: capturedAt,
                    settlementEta: settlementEta,
                },
            });

            res.json({ success: true, message: "Payment verified and ledger updated" });

        } catch (error) {
            console.error("Verification Error:", error);
            res.status(500).json({ success: false, error: "Payment verification failed" });
        }
    }

    // ---------------------------------------------------------
    // 1.5. CREATE SUBSCRIPTION ORDER (For Razorpay Activation)
    // ---------------------------------------------------------
    async createSubscriptionOrder(req: Request, res: Response) {
        try {
            const { userId } = req.body || {};
            const amountInRupees = 700;
            const amountInPaise = amountInRupees * 100;

            const options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: `sub_${Date.now().toString().slice(-8)}`,
                payment_capture: 1,
                notes: {
                    type: "subscription_activation",
                    description: "Hypechart Pro Monthly",
                    userId: userId || "unknown" // SECURITY FIX: Track who is actually purchasing
                }
            };

            const order = await razorpay.orders.create(options);

            res.json({
                success: true,
                orderId: order.id,
                amount: amountInPaise,
                currency: "INR",
                keyId: process.env.RAZORPAY_KEY_ID,
                productName: "Hypechart Pro Monthly"
            });

        } catch (error: any) {
            console.error("Subscription Init Error:", error);
            res.status(500).json({ success: false, error: "Subscription initialization failed" });
        }
    }
}