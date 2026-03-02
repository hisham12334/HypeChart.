import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import jwt from 'jsonwebtoken';

const router = Router();
const controller = new OrderController();

const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.get('/', requireAuth, controller.list.bind(controller));
router.patch('/:id/status', requireAuth, controller.updateStatus.bind(controller));

export default router;
