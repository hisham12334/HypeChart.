import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { AuthService } from '../services/auth.service';

const router = Router();
const productController = new ProductController();
const authService = new AuthService();

// Middleware to verify JWT token
const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Manually verify for now (we'll make a cleaner middleware file later)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/', requireAuth, productController.create);
router.get('/', requireAuth, productController.list);

export default router;