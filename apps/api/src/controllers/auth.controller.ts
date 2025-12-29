import { Request, Response } from 'express';
import { PrismaClient } from '@brand-order-system/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'; // Ensure this matches your .env

export class AuthController {

    // POST /api/auth/register
    async register(req: Request, res: Response) {
        try {
            const { email, password, brandName } = req.body;

            // 1. Check if user exists
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return res.status(400).json({ success: false, error: 'Email already exists' });
            }

            // 2. Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 3. Create User
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    brandName
                }
            });

            // 4. Create Token (Optional: auto-login after register)
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

            res.status(201).json({
                success: true,
                token,
                user: { id: user.id, email: user.email, brandName: user.brandName }
            });

        } catch (error: any) {
            console.error('Register error:', error);
            res.status(500).json({ success: false, error: 'Registration failed' });
        }
    }

    // POST /api/auth/login
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            // 1. Find User
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({ success: false, error: 'Invalid credentials' });
            }

            // 2. Check Password
            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                return res.status(400).json({ success: false, error: 'Invalid credentials' });
            }

            // 3. Generate Token
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

            res.json({
                success: true,
                token,
                user: { id: user.id, email: user.email, brandName: user.brandName }
            });

        } catch (error: any) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, error: 'Login failed' });
        }
    }

    // GET /api/auth/me
    // This is the CRITICAL method for your Cloudinary folder logic
    async me(req: Request, res: Response) {
        try {
            // The 'requireAuth' middleware attaches the decoded token to (req as any).user
            const user = (req as any).user;

            if (!user) {
                return res.status(401).json({ success: false, error: 'Not authenticated' });
            }

            // We return the ID so the frontend can use it for folder naming
            res.json({
                success: true,
                data: {
                    id: user.userId,
                    email: user.email
                }
            });

        } catch (error) {
            res.status(500).json({ success: false, error: 'Server error' });
        }
    }
}