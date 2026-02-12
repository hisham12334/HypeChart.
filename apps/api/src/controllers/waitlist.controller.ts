import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class WaitlistController {
    async joinWaitlist(req: Request, res: Response) {
        try {
            const { brandName, instagram, email } = req.body;

            if (!brandName || !instagram || !email) {
                return res.status(400).json({ success: false, error: "Missing required fields" });
            }

            const entry = await prisma.waitlist.create({
                data: {
                    brandName,
                    instagram,
                    email
                }
            });

            res.json({ success: true, message: "Added to waitlist", id: entry.id });

        } catch (error) {
            console.error("Waitlist Error:", error);
            res.status(500).json({ success: false, error: "Failed to join waitlist" });
        }
    }
}
