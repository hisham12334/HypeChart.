// apps/api/src/routes/store.routes.ts
import { Router, Request, Response } from 'express';
import { StoreController } from '../controllers/store.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { getWhatsAppSettings, saveWhatsAppSettings } from '../controllers/whatsapp-settings.controller';
import { sendWhatsAppMessage } from '../services/whatsapp.service';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();
const router = Router();
const controller = new StoreController();

// Public Routes
router.get('/product/:slug', controller.getProductBySlug.bind(controller));
router.post('/stock', controller.checkStock.bind(controller));

// Protected Payment Settings Routes
router.post('/connect-bank', requireAuth, controller.connectLinkedAccount.bind(controller));
router.post('/save-keys', requireAuth, controller.saveProApiKeys.bind(controller));

// Protected WhatsApp Settings Routes
router.get('/whatsapp-settings', requireAuth, getWhatsAppSettings);
router.post('/whatsapp-settings', requireAuth, saveWhatsAppSettings);

// 🧪 DEBUG: Test WhatsApp send directly
router.post('/test-whatsapp', requireAuth, async (req: Request, res: Response) => {
    const { userId } = (req as any).user;
    const { toPhone } = req.body;

    try {
        // Raw SQL to guarantee we get the fresh columns
        const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT "whatsappPhoneNumberId", "whatsappToken", "whatsappEnabled", "brandName" FROM "User" WHERE id = $1`,
            userId
        );
        const brand = rows[0];

        console.log('🧪 test-whatsapp brand data:', JSON.stringify(brand, null, 2));

        if (!brand?.whatsappPhoneNumberId || !brand?.whatsappToken) {
            return res.status(400).json({
                success: false,
                error: 'No WhatsApp credentials found in DB',
                brand: { ...brand, whatsappToken: brand?.whatsappToken ? '[SET]' : '[MISSING]' }
            });
        }

        const result = await sendWhatsAppMessage(
            brand.whatsappPhoneNumberId,
            brand.whatsappToken,
            toPhone || '918590558702',
            'hello_world', // Use approved hello_world template for test pings
            []             // hello_world takes no body parameters
        );

        console.log('🧪 test-whatsapp result:', result);
        return res.json({ success: result.success, result, brand: { ...brand, whatsappToken: '[HIDDEN]' } });
    } catch (err: any) {
        console.error('🧪 test-whatsapp error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
