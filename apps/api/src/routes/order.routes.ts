import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { AuthService } from '../services/auth.service';

const router = Router();
const orderController = new OrderController();

// Middleware to verify JWT (Copy from product routes or extract to file)
const requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        req.user = decoded;
        next();
    } catch (err) { return res.status(401).json({ error: 'Invalid token' }); }
};

router.get('/', requireAuth, orderController.list);

export default router;