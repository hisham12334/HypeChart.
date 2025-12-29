import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware'; // Ensure you have this middleware

const router = Router();
const controller = new AuthController();

// Public Routes
router.post('/register', controller.register);
router.post('/login', controller.login);

// Protected Routes (Requires Token)
// This is the one your Frontend calls to get the User ID
router.get('/me', requireAuth, controller.me);

export default router;