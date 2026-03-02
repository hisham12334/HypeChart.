import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

/**
 * GET /api/store/whatsapp-settings
 * Returns current WhatsApp Business settings for the logged-in brand
 */
export const getWhatsAppSettings = async (req: Request, res: Response) => {
    try {
        const { userId } = (req as any).user;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                whatsappPhoneNumberId: true,
                whatsappToken: true,
                whatsappEnabled: true,
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Mask the token — return only last 6 chars for display
        const maskedToken = user.whatsappToken
            ? '••••••••••••••••••••' + user.whatsappToken.slice(-6)
            : null;

        return res.json({
            success: true,
            data: {
                phoneNumberId: user.whatsappPhoneNumberId || '',
                token: maskedToken,
                hasToken: !!user.whatsappToken,
                enabled: user.whatsappEnabled ?? false,
            }
        });
    } catch (error: any) {
        console.error('Get WhatsApp settings error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
};

/**
 * POST /api/store/whatsapp-settings
 * Save WhatsApp Business credentials for the logged-in brand
 */
export const saveWhatsAppSettings = async (req: Request, res: Response) => {
    try {
        const { userId } = (req as any).user;
        const { phoneNumberId, token, enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ success: false, error: 'Invalid enabled flag' });
        }

        // Build update object — only update token if a new non-masked one was provided
        const updateData: any = {
            whatsappPhoneNumberId: phoneNumberId || null,
            whatsappEnabled: enabled,
        };

        // Only update the token if it's a real new value (not the masked placeholder)
        if (token && !token.startsWith('••••••••')) {
            updateData.whatsappToken = token;
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        return res.json({ success: true, message: 'WhatsApp settings saved successfully' });
    } catch (error: any) {
        console.error('Save WhatsApp settings error:', error);
        return res.status(500).json({ success: false, error: 'Failed to save settings' });
    }
};
