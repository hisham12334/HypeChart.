import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';

const router = Router();
const controller = new StoreController();

// The "Drop Link" Route
// Frontend will call this to display the product page
router.get('/product/:productId', controller.getProductById);

// Stock Validation
router.post('/stock', controller.checkStock);

// (Optional) Keep the brand route if you want it later
router.get('/:slug', controller.getStoreBySlug);

export default router;