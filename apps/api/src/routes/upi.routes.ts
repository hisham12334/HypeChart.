import { Router } from 'express';
import { UpiController } from '../controllers/upi.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();
const router = Router();
const controller = new UpiController();

// Public
router.post('/initiate', (req, res) => controller.initiate(req, res));
router.post('/confirm', (req, res) => controller.confirm(req, res));
router.get('/whatsapp-inbound', (req, res) => controller.whatsappInbound(req, res));
router.post('/whatsapp-inbound', (req, res) => controller.whatsappInbound(req, res));

// Get brand payment mode by brandId (used by checkout to detect UPI_DIRECT)
router.get('/brand-mode/:brandId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.brandId },
      select: { paymentMode: true, upiId: true }
    });
    if (!user) return res.status(404).json({ error: 'Brand not found' });
    return res.json({ paymentMode: user.paymentMode, upiId: user.upiId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Protected
router.get('/pending', requireAuth, (req, res) => controller.getPending(req, res));
router.post('/manual-confirm', requireAuth, (req, res) => controller.manualConfirm(req, res));

// Save UPI ID + switch payment mode
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { upiId } = req.body;

    if (!upiId || !upiId.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid UPI ID required (e.g. name@bank)' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { upiId, paymentMode: 'UPI_DIRECT' }
    });

    return res.json({ success: true, message: 'UPI settings saved' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;