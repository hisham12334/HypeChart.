// apps/api/src/controllers/store.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';
import { encrypt } from '../utils/crypto.util';

const prisma = new PrismaClient();

export class StoreController {
  // Public: Get product by checkout slug
  async getProductBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      console.log('🔍 Fetching product with checkoutSlug:', slug);

      const product = await prisma.product.findUnique({
        where: { checkoutSlug: slug },
        include: {
          variants: true,
          user: {
            select: {
              id: true,
              brandName: true,
              logoUrl: true,
              paymentMode: true,
              upiId: true
            }
          }
        }
      });

      console.log('📦 Product found:', product ? 'YES' : 'NO');

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Calculate available count for each variant
      const productWithAvailability = {
        ...product,
        variants: product.variants.map(variant => ({
          ...variant,
          availableCount: variant.inventoryCount - variant.reservedCount
        }))
      };

      res.json(productWithAvailability);
    } catch (error: any) {
      console.error('❌ Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  // Public: Check stock availability for cart items
  async checkStock(req: Request, res: Response) {
    try {
      const { items } = req.body; // Array of { variantId, quantity }

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'Invalid request' });
      }

      const results = await Promise.all(
        items.map(async (item: { variantId: string; quantity: number }) => {
          const variant = await prisma.variant.findUnique({
            where: { id: item.variantId }
          });

          if (!variant) {
            return {
              variantId: item.variantId,
              inStock: false,
              available: 0,
              requested: item.quantity
            };
          }

          const available = variant.inventoryCount - variant.reservedCount;
          return {
            variantId: item.variantId,
            inStock: available >= item.quantity,
            available,
            requested: item.quantity
          };
        })
      );

      const allInStock = results.every(r => r.inStock);

      res.json({
        success: true,
        allInStock,
        results
      });
    } catch (error: any) {
      console.error('❌ Error checking stock:', error);
      res.status(500).json({ success: false, error: 'Failed to check stock' });
    }
  }

  // 1. STARTER TIER: Connect Bank
  async connectLinkedAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { accountName, email, beneficiaryName, accountNumber, ifscCode } = req.body;

      console.log('Saving bank details for user:', userId);

      // For now, just store the bank details in the database
      // TODO: Enable Razorpay Route feature and create linked account
      // Contact Razorpay support to enable Route: https://razorpay.com/docs/route/

      const mockAccountId = `acc_dev_${Date.now()}`; // Mock account ID for development

      await prisma.user.update({
        where: { id: userId },
        data: {
          razorpayLinkedAccountId: mockAccountId,
          plan: 'STARTER'
        }
      });

      console.log('Bank details saved successfully');

      res.json({
        success: true,
        accountId: mockAccountId,
        message: 'Bank details saved. Razorpay Route integration pending activation.'
      });
    } catch (error: any) {
      console.error("Bank linking error:", error);
      res.status(500).json({
        error: error.message || "Failed to save bank details"
      });
    }
  }

  // 2. PRO TIER: Save Keys (BYOG — Bring Your Own Gateway)
  // The Key Secret is AES-256-GCM encrypted before being stored.
  // On checkout, it is decrypted in-memory only when needed.
  async saveProApiKeys(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { keyId, keySecret } = req.body;

      if (!keyId || !keySecret) {
        return res.status(400).json({ success: false, error: 'keyId and keySecret are required' });
      }

      // Encrypt the secret before persisting — never store plain text
      const encryptedSecret = encrypt(keySecret);

      await prisma.user.update({
        where: { id: userId },
        data: {
          razorpayKeyId: keyId,
          razorpayKeySecret: encryptedSecret,
          plan: 'PRO'
        }
      });

      console.log(`✅ Pro gateway keys saved for user: ${userId}`);
      res.json({ success: true, message: 'Gateway keys saved and encrypted successfully.' });
    } catch (error: any) {
      console.error('saveProApiKeys error:', error);
      res.status(500).json({ success: false, error: 'Failed to save API keys' });
    }
  }
}