import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';

const router = Router();
const controller = new CheckoutController();

router.get('/products/:slug', controller.getProduct);
router.post('/reserve', controller.reserve);

export default router;