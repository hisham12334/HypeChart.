import { Router } from 'express';
import { WaitlistController } from '../controllers/waitlist.controller';

const router = Router();
const controller = new WaitlistController();

router.post('/', controller.joinWaitlist);

export default router;
