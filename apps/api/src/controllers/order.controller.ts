import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';
import {
    sendWhatsAppMessage,
    getOrderTemplate,
    formatPhoneForWhatsApp,
} from '../services/whatsapp.service';

const prisma = new PrismaClient();

// Valid order status transitions (in order)
const STATUS_FLOW = ['paid', 'confirmed', 'shipped', 'delivered'];

export class OrderController {

    // GET /api/orders
    async list(req: Request, res: Response) {
        try {
            const { userId } = (req as any).user;
            const orders = await prisma.order.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: {
                    customer: true,
                    address: true,
                    items: true,
                    user: true
                }
            });

            // Enrich items with variant imageUrl in a single batch query
            const allVariantIds = [...new Set(orders.flatMap(o => o.items.map(i => i.variantId)))];
            const variants = allVariantIds.length > 0
                ? await prisma.variant.findMany({
                    where: { id: { in: allVariantIds } },
                    select: { id: true, imageUrl: true }
                  })
                : [];
            const variantImageMap = Object.fromEntries(variants.map(v => [v.id, v.imageUrl]));

            const enrichedOrders = orders.map(o => ({
                ...o,
                items: o.items.map(i => ({
                    ...i,
                    imageUrl: variantImageMap[i.variantId] || null
                }))
            }));

            res.json({ success: true, data: enrichedOrders });
        } catch (error: any) {
            console.error("Fetch orders error:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // PATCH /api/orders/:id/status
    async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const { userId } = (req as any).user;

            // Validate status value
            if (!STATUS_FLOW.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status. Must be one of: ${STATUS_FLOW.join(', ')}`
                });
            }

            // Fetch the order
            const order = await prisma.order.findFirst({
                where: { id, userId },
                include: {
                    customer: true,
                    items: true,
                }
            });

            if (!order) {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }

            // Validate status transition
            const currentIndex = STATUS_FLOW.indexOf(order.status);
            const newIndex = STATUS_FLOW.indexOf(status);

            if (newIndex <= currentIndex) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot move from '${order.status}' to '${status}'. Status can only move forward.`
                });
            }

            if (newIndex > currentIndex + 1) {
                return res.status(400).json({
                    success: false,
                    error: `Next status after '${order.status}' must be '${STATUS_FLOW[currentIndex + 1]}'.`
                });
            }

            const updateData: any = { status };

            if (['confirmed', 'shipped', 'delivered'].includes(status)) {
                updateData.paymentStatus = 'paid';
                updateData.upiVerificationStatus = 'CONFIRMED';
                if (!order.paidAt) {
                    updateData.paidAt = new Date();
                }
            }

            // Update the order status
            const updatedOrder = await prisma.order.update({
                where: { id },
                data: updateData,
                include: {
                    customer: true,
                    address: true,
                    items: true,
                    user: true,
                }
            });

            // Create transaction for UPI orders being confirmed via status update
            if (
                ['confirmed', 'shipped', 'delivered'].includes(status) &&
                order.paymentStatus === 'upi_pending'
            ) {
                try {
                    await prisma.transaction.upsert({
                        where: { razorpayOrderId: order.razorpayOrderId },
                        update: {},
                        create: {
                            userId: order.userId,
                            orderId: order.id,
                            razorpayOrderId: order.razorpayOrderId,
                            grossAmount: Number(order.total),
                            razorpayFee: 0,
                            platformFee: 0,
                            netAmount: Number(order.total),
                            status: 'SETTLED',
                            capturedAt: new Date(),
                            settledAt: new Date(),
                        }
                    });

                    await prisma.customer.update({
                        where: { id: order.customerId },
                        data: {
                            totalOrders: { increment: 1 },
                            totalSpent: { increment: Number(order.total) },
                            lastOrderAt: new Date()
                        }
                    });
                } catch (e) {
                    console.error('Failed to create UPI transaction record:', e);
                }
            }

            // Fetch WA credentials via raw SQL (bypasses stale Prisma type cache)
            const brandRows = await prisma.$queryRawUnsafe<any[]>(
                `SELECT "whatsappPhoneNumberId", "whatsappToken", "whatsappEnabled", "brandName"
                 FROM "User" WHERE id = $1`,
                userId
            );
            const brand = brandRows[0];
            const rawPhone = order.customer?.phone || '';
            const formattedPhone = formatPhoneForWhatsApp(rawPhone);

            console.log('📱 WA status update check:', {
                enabled: brand?.whatsappEnabled,
                hasPhoneNumberId: !!brand?.whatsappPhoneNumberId,
                hasToken: !!brand?.whatsappToken,
                rawCustomerPhone: rawPhone,
                formattedPhone,
            });

            let waResult: any = { skipped: true, reason: 'not attempted' };

            if (
                brand?.whatsappEnabled === true &&
                brand?.whatsappPhoneNumberId &&
                brand?.whatsappToken &&
                rawPhone
            ) {
                const template = getOrderTemplate(
                    status,
                    order.customer!.name,
                    order.orderNumber,
                    brand.brandName || 'Our Store'
                );

                if (template) {
                    console.log(`📱 Sending WA template '${template.templateName}' to ${formattedPhone}`);
                    waResult = await sendWhatsAppMessage(
                        brand.whatsappPhoneNumberId,
                        brand.whatsappToken,
                        rawPhone,
                        template.templateName,
                        template.parameters
                    );
                } else {
                    waResult = { skipped: true, reason: `No template mapped for status '${status}'` };
                }
                console.log('📱 WA result:', waResult);
            } else {
                waResult = {
                    skipped: true,
                    reason: 'missing credentials or disabled',
                    enabled: brand?.whatsappEnabled,
                    hasPhoneNumberId: !!brand?.whatsappPhoneNumberId,
                    hasToken: !!brand?.whatsappToken,
                    hasPhone: !!rawPhone,
                };
            }

            return res.json({ success: true, data: updatedOrder, whatsapp: waResult });
        } catch (error: any) {
            console.error("Update order status error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
}
