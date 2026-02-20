import express = require('express');
import cors = require('cors');
import helmet from 'helmet';
import morgan = require('morgan');
import { config } from 'dotenv';
import path from 'path';

import productRoutes from './routes/product.routes';
import checkoutRoutes from './routes/checkout.routes';
import webhookRoutes from './routes/webhook.routes';
import { OrderController } from './controllers/order.controller';
import orderRoutes from './routes/order.routes';
import analyticsRoutes from './routes/analytics.routes';
import authRoutes from './routes/auth.routes';
import paymentRoutes from './routes/payment.routes';
import storeRoutes from './routes/store.routes';
import waitlistRoutes from './routes/waitlist.routes';
import rateLimit from 'express-rate-limit';
import { startInventoryCleanupJob } from './jobs/inventory-cleanup.job';


// Resolve .env from monorepo root (works for both ts-node from src/ and node from dist/)
const envPath = path.resolve(__dirname, '../../.env');
config({ path: envPath });
console.log(`📄 Loading env from: ${envPath}`);

const app = express();
const port = process.env.PORT || 4000;

const orderController = new OrderController();



app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: '*', // Allow all origins for development (Admin:3000, Checkout:3001)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key']
}));

startInventoryCleanupJob();
console.log("⏰ Inventory Cleanup Job Scheduled");


// IMPORTANT: Raw body parser for webhook signature verification
// Must be registered before express.json() to receive raw body
app.use('/api/webhooks/razorpay', express.raw({ type: 'application/json' }));

// Regular JSON parser for other routes
app.use(express.json());

app.use('/api/payments', paymentRoutes);
app.use('/api/store', storeRoutes);




app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);

// NOTE: /api/auth/login and /api/auth/register are handled by authRoutes above

app.use('/api/checkout', checkoutRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/waitlist', waitlistRoutes);

app.listen(port, () => {
  console.log(`🚀 API Server running at http://localhost:${port}`);
})

// GENERAL LIMITER (Apply to all routes)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// CHECKOUT LIMITER (Stricter!)
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 checkout attempts per hour
  message: "Too many checkout attempts from this IP, please try again after an hour"
});

// Apply them
app.use('/api', generalLimiter);
app.use('/api/checkout', checkoutLimiter); // Apply stricter limit to checkout routes