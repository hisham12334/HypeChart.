import express = require('express');
import cors = require('cors');
import helmet from 'helmet';
import morgan = require('morgan');
import { config } from 'dotenv';
import path from 'path';
import { AuthService } from './services/auth.service';
import { PrismaClient } from '@brand-order-system/database';
import productRoutes from './routes/product.routes';
import checkoutRoutes from './routes/checkout.routes';
import webhookRoutes from './routes/webhook.routes';
import { OrderController } from './controllers/order.controller';
import orderRoutes from './routes/order.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';

config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 4000;
const prisma = new PrismaClient();
const authService = new AuthService();
const orderController = new OrderController();



app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: '*', // Allow all origins for development (Admin:3000, Checkout:3001)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key']
}));



// IMPORTANT: Raw body parser for webhook signature verification
// Must be registered before express.json() to receive raw body
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));

// Regular JSON parser for other routes
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);

// Register Route (Temporary for setup)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, brandName } = req.body;
    const passwordHash = await authService.hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, brandName }
    });

    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(401).json({ success: false, error: error.message });
  }
});

app.use('/api/checkout', checkoutRoutes);
app.use('/api/analytics', analyticsRoutes);

app.listen(port, () => {
  console.log(`🚀 API Server running at http://localhost:${port}`);
});