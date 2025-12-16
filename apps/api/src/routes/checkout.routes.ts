import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';

const router = Router();
const controller = new CheckoutController();


router.get('/products/:slug', controller.getProduct);
// Changed from 'reserve' to 'create-order' to reflect full process
router.post('/create-order', controller.createOrder);

router.post('/verify', controller.verifyPayment);

export default router;
