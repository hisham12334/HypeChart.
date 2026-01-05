import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@brand-order-system/database';

const prisma = new PrismaClient();

export class AuthController {

    // -------------------------------------------------------
    // REGISTER
    // -------------------------------------------------------
    async register(req: Request, res: Response) {
        try {
            const { email, password, name, brandName } = req.body;

            // 1. Check if user exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'User already exists' });
            }

            // 2. Generate Slug from Brand Name (or Name)
            // "Haqq Founder" -> "haqq-founder"
            // "Haqq" -> "haqq"
            let rawSlug = (brandName || name || '').toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            // Fallback if slug became empty
            if (!rawSlug) rawSlug = `brand-${Date.now()}`;

            // 3. Ensure Slug is Unique
            // If "haqq" exists, we make "haqq-1", "haqq-2"
            let slug = rawSlug;
            let count = 1;
            while (await prisma.user.findUnique({ where: { slug } })) {
                slug = `${rawSlug}-${count}`;
                count++;
            }

            // 4. Hash Password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 5. Create User
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    brandName,
                    slug // <--- Save the generated slug!
                }
            });

            // 6. Generate Token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'supersecret',
                { expiresIn: '7d' }
            );

            res.status(201).json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    brandName: user.brandName,
                    slug: user.slug
                }
            });

        } catch (error) {
            console.error("Registration Error:", error); // Check your terminal for this log!
            res.status(500).json({ success: false, error: 'Registration failed' });
        }
    }

    // -------------------------------------------------------
    // LOGIN
    // -------------------------------------------------------
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({ success: false, error: 'Invalid credentials' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, error: 'Invalid credentials' });
            }

            // Generate Token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'supersecret',
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    brandName: user.brandName,
                    slug: user.slug
                }
            });
        } catch (error) {
            console.error("Login Error:", error);
            res.status(500).json({ success: false, error: 'Login failed' });
        }
    }

    // -------------------------------------------------------
    // GET ME (Current User)
    // -------------------------------------------------------
    async getMe(req: Request, res: Response) {
        try {
            // The 'req.user' is added by the requireAuth middleware
            const userId = (req as any).user?.userId;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, brandName: true, slug: true }
            });

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Server error' });
        }
    }
}