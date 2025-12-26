import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import jwt from 'jsonwebtoken'; // <--- IMPORT THIS

const router = Router();
const controller = new AnalyticsController();

// Middleware to verify JWT
const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        // ACTUAL VERIFICATION
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.get('/', requireAuth, controller.getStats);

export default router;