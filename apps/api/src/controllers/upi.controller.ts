import { Request, Response } from 'express';
import {
    initiateUpiOrder,
    confirmUpiPayment,
    handleBrandReply,
    manualConfirmUpiOrder
} from '../services/upi.service';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class UpiController {

    // POST /api/upi/initiate
    async initiate(req: Request, res: Response) {
        try {
            const { brandId, items, customerDetails, sessionId } = req.body;

            if (!brandId || !items || !customerDetails || !sessionId) {
                return res.status(400).json({ success: false, error: 'Missing required fields' });
            }

            const result = await initiateUpiOrder({ brandId, items, customerDetails, sessionId });
            return res.json({ success: true, data: result });
        } catch (err: any) {
            console.error('UPI initiate error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/upi/confirm
    async confirm(req: Request, res: Response) {
        try {
            const { orderId, utrNumber, customerPhone } = req.body;

            if (!orderId || !utrNumber) {
                return res.status(400).json({ success: false, error: 'orderId and utrNumber are required' });
            }

            const result = await confirmUpiPayment({ orderId, utrNumber, customerPhone });
            return res.json({ success: true, data: result });
        } catch (err: any) {
            console.error('UPI confirm error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/upi/whatsapp-inbound
    // Called by Meta webhook when brand replies 1 or 2
    async whatsappInbound(req: Request, res: Response) {
        try {
            const body = req.body;

            // Meta sends webhook verification as GET — handle here too
            if (req.method === 'GET') {
                const mode = req.query['hub.mode'];
                const token = req.query['hub.verify_token'];
                const challenge = req.query['hub.challenge'];

                if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
                    return res.status(200).send(challenge);
                }
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Parse inbound message from brand
            const entry = body?.entry?.[0];
            const changes = entry?.changes?.[0];
            const message = changes?.value?.messages?.[0];

            if (!message) {
                return res.status(200).json({ received: true }); // Always 200 to Meta
            }

            const replyText = message?.text?.body?.trim() || message?.interactive?.button_reply?.id || '';
            const fromPhone = message.from;

            // Extract order number from context — we embed it in the WA message body
            // Format expected: brand replies "1" or "2" in response to our message
            // We match pending orders by brand's phone number
            if (replyText === '1' || replyText === '2') {
                const confirmed = replyText === '1';

                // Find most recent AWAITING order for this brand's phone
                // We look up by brand's whatsapp phone number id
                const brandRows = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT id FROM "User" WHERE "whatsappPhoneNumberId" = $1 LIMIT 1`,
                    fromPhone
                );

                if (brandRows.length > 0) {
                    const brandId = brandRows[0].id;
                    const pendingOrder = await prisma.order.findFirst({
                        where: { userId: brandId, upiVerificationStatus: 'AWAITING' },
                        orderBy: { createdAt: 'desc' }
                    });

                    if (pendingOrder) {
                        await handleBrandReply(pendingOrder.orderNumber, confirmed);
                    }
                }
            }

            return res.status(200).json({ received: true });
        } catch (err: any) {
            console.error('WhatsApp inbound error:', err);
            return res.status(200).json({ received: true }); // Always 200 to Meta
        }
    }

    // GET /api/upi/pending  (protected)
    async getPending(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const orders = await prisma.order.findMany({
                where: { userId, upiVerificationStatus: 'AWAITING' },
                orderBy: { createdAt: 'desc' },
                include: { customer: true, items: true }
            });

            return res.json({ success: true, data: orders });
        } catch (err: any) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // POST /api/upi/manual-confirm  (protected)
    async manualConfirm(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.userId;
            const { orderId } = req.body;

            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            if (!orderId) return res.status(400).json({ error: 'orderId required' });

            const result = await manualConfirmUpiOrder(orderId, userId);
            return res.json({ success: true, data: result });
        } catch (err: any) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}