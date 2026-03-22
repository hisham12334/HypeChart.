import { PrismaClient } from '@brand-order-system/database';
import {
    sendWhatsAppMessage,
    getOrderTemplate,
} from './whatsapp.service';
import { logger } from '../utils/logger';
import { calculateSettlementEta } from '../utils/date.util';

const prisma = new PrismaClient();

interface OrderCreationData {
    merchantUserId: string;
    // ADDED: Session ID is required to find and clear the specific reservation
    sessionId: string;
    customerDetails: {
        name: string;
        phone: string;
        email?: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        amount: string;
    };
    orderItems: { variantId: string; quantity: number }[];
    razorpayOrderId: string;
    razorpayPaymentId: string;
    internalOrderId: string;
    feePercent: number;
    variants: any[]; // Expects variants with product included
}

export const createOrderWithIdempotency = async (data: OrderCreationData, idempotencyKey: string) => {
    const txResult = await prisma.$transaction(async (tx) => {
        // 1. ATOMIC CHECK: Try to create the Idempotency Key record immediately.
        // If this fails (Unique Constraint Violation), it means it's already being processed.
        const existingKey = await tx.idempotencyKey.findUnique({
            where: { key: idempotencyKey }
        });

        if (existingKey) {
            // Return the previously saved response if it exists
            return existingKey.responseBody;
        }

        // 2. Lock the key (Create it as "PENDING")
        await tx.idempotencyKey.create({
            data: {
                key: idempotencyKey,
                responseBody: {}, // Empty for now
                status: 'PROCESSING'
            }
        });

        // 3. EXECUTE BUSINESS LOGIC
        const {
            merchantUserId,
            sessionId, // <--- Extract Session ID
            customerDetails,
            orderItems,
            razorpayOrderId,
            razorpayPaymentId,
            internalOrderId,
            feePercent,
            variants
        } = data;

        // Create Map for fast lookup
        const variantMap = new Map();
        variants.forEach((v: any) => variantMap.set(v.id, v));

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
                id: internalOrderId,
                userId: merchantUserId,
                customerId: customer.id,
                addressId: address.id,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                razorpayOrderId: razorpayOrderId,
                razorpayPaymentId: razorpayPaymentId,

                // Financials
                subtotal: parseFloat(customerDetails.amount),
                shippingFee: 0,
                total: parseFloat(customerDetails.amount),

                // Status Enums
                paymentStatus: 'paid',
                status: 'paid', // Set to 'paid' to reflect successful payment immediately
                productDropDate: variants[0]?.product?.productDropDate,

                // Create Order Items
                items: {
                    create: orderItems.map((item: any) => {
                        const v = variantMap.get(item.variantId);
                        return {
                            productId: v.productId,
                            variantId: item.variantId,
                            productName: v.product.name,
                            variantName: v.name,
                            price: v.product.basePrice,
                            quantity: item.quantity
                        };
                    })
                }
            }
        });

        // D. Create Financial Transaction Ledger
        const grossAmount = parseFloat(customerDetails.amount);
        // ── Fee split ───────────────────────────────────────────────────
        // Razorpay always deducts 2% before settling to the platform.
        // Platform fee is NOT deducted — brand receives gross minus razorpay fee only.
        const RAZORPAY_FEE_PERCENT = 2;
        const razorpayFee = parseFloat(((grossAmount * RAZORPAY_FEE_PERCENT) / 100).toFixed(2));
        const platformFee = 0; // No platform fee charged
        const netAmount = parseFloat((grossAmount - razorpayFee).toFixed(2));
        
        // Calculate settlement ETA (T+2 business days, excluding weekends)
        const capturedAt = new Date();
        const settlementEta = calculateSettlementEta(capturedAt);
        // ────────────────────────────────────────────────────────────────

        await tx.transaction.create({
            data: {
                userId: merchantUserId,
                razorpayOrderId: razorpayOrderId,
                razorpayPaymentId: razorpayPaymentId,
                grossAmount: grossAmount,
                razorpayFee: razorpayFee,
                platformFee: platformFee,
                netAmount: netAmount,
                status: "CAPTURED",
                capturedAt: capturedAt,
                settlementEta: settlementEta,
            }
        });

        // E. CRITICAL: Commit Inventory & Clear Reservation
        // We must loop through items to update stock and clear the specific reservation
        for (const item of orderItems) {
            await tx.variant.update({
                where: { id: item.variantId },
                data: {
                    // Permanently remove from inventory
                    inventoryCount: { decrement: item.quantity },
                    // Release the reservation (since it's now sold)
                    reservedCount: { decrement: item.quantity }
                }
            });

            // Delete the temporary reservation record so the Cron job doesn't try to clear it later
            await tx.cartReservation.deleteMany({
                where: {
                    sessionId: sessionId,
                    variantId: item.variantId
                }
            });
        }

        // F. Update Customer Stats
        await tx.customer.update({
            where: { id: customer.id },
            data: {
                totalOrders: { increment: 1 },
                totalSpent: { increment: parseFloat(customerDetails.amount) },
                lastOrderAt: new Date()
            }
        });

        const responsePayload = { success: true, orderId: newOrder.id };

        // 4. UPDATE Idempotency Key with the result
        await tx.idempotencyKey.update({
            where: { key: idempotencyKey },
            data: {
                responseBody: responsePayload,
                status: 'COMPLETED'
            }
        });

        return responsePayload;
    });

    // G. Send WhatsApp "Order Placed" notification (outside transaction so WA failure never rolls back the order)
    // Only send for freshly-created orders, not idempotent replays
    const isNewOrder = txResult && (txResult as any).success === true;
    try {
        if (isNewOrder) {
            const brandRows = await prisma.$queryRawUnsafe<any[]>(
                `SELECT "whatsappPhoneNumberId", "whatsappToken", "whatsappEnabled", "brandName"
                 FROM "User" WHERE id = $1`,
                data.merchantUserId
            );
            const brand = brandRows[0];

            if (
                brand?.whatsappEnabled === true &&
                brand?.whatsappPhoneNumberId &&
                brand?.whatsappToken &&
                data.customerDetails.phone
            ) {
                const itemList = data.orderItems.map((item: any) => {
                    const v = data.variants.find((vv: any) => vv.id === item.variantId);
                    return {
                        productName: v?.product?.name || 'Item',
                        variantName: v?.name || '',
                        quantity: item.quantity,
                    };
                });

                // Fetch the order number we just created
                const createdOrder = await prisma.order.findUnique({
                    where: { id: data.internalOrderId },
                    select: { orderNumber: true }
                });

                const template = getOrderTemplate(
                    'order_placed',
                    data.customerDetails.name,
                    createdOrder?.orderNumber || data.internalOrderId,
                    brand.brandName || 'Our Store'
                );

                if (template) {
                    const waResult = await sendWhatsAppMessage(
                        brand.whatsappPhoneNumberId,
                        brand.whatsappToken,
                        data.customerDetails.phone,
                        template.templateName,
                        template.parameters
                    );

                    logger.info('Order placed WA notification result', {
                        orderId: data.internalOrderId,
                        waSuccess: waResult.success,
                        waMessageId: waResult.messageId,
                        waError: waResult.error,
                    });
                }
            }
        }
    } catch (waError: any) {
        logger.error('Failed to send order_placed WhatsApp notification', {
            orderId: data.internalOrderId,
            error: waError.message,
        });
        // Intentionally not re-throwing — WA failure must not break order creation
    }

    return txResult;
};