import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';
import Razorpay from 'razorpay';
import { encrypt } from '../utils/crypto.util';

const prisma = new PrismaClient();

// The Platform's Master Keys (from your .env)
const platformRazorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// 1. STARTER TIER: Connect Bank Details
export const connectLinkedAccount = async (req: Request, res: Response) => {
    try {
        const { userId } = req.user; // Assuming auth middleware
        const { accountName, email, beneficiaryName, accountNumber, ifscCode } = req.body;

        // Call Razorpay Accounts API to create a Linked Account
        const account = await platformRazorpay.accounts.create({
            email: email,
            phone: req.body.phone || '9999999999',
            type: 'route',
            reference_id: userId,
            legal_business_name: accountName,
            business_type: 'individual',
            contact_name: beneficiaryName,
            profile: {
                category: 'ecommerce',
                subcategory: 'fashion_and_lifestyle',
                addresses: {
                    registered: {
                        street1: req.body.street1 || 'N/A',
                        street2: req.body.street2 || '',
                        city: req.body.city || 'N/A',
                        state: req.body.state || 'N/A',
                        postal_code: req.body.postal_code || '000000',
                        country: 'IN'
                    }
                }
            },
            legal_info: {
                pan: req.body.pan || 'AAAAA0000A',
                gst: req.body.gst || ''
            }
        });

        // Save the acc_XXXX ID to the user's profile
        await prisma.user.update({
            where: { id: userId },
            data: { razorpayLinkedAccountId: account.id }
        });

        res.json({ success: true, accountId: account.id });
    } catch (error) {
        res.status(500).json({ error: "Failed to create linked account" });
    }
};

// 2. PRO TIER: Bring Your Own Gateway (BYOG)
export const saveProApiKeys = async (req: Request, res: Response) => {
    try {
        const { userId } = req.user;
        const { keyId, keySecret } = req.body;

        // Encrypt the secret before persisting — never store plain text
        const encryptedSecret = encrypt(keySecret);

        await prisma.user.update({
            where: { id: userId },
            data: {
                razorpayKeyId: keyId,
                razorpayKeySecret: encryptedSecret,
                plan: "PRO"
            }
        });

        res.json({ success: true, message: "Gateway keys saved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save API keys" });
    }
};