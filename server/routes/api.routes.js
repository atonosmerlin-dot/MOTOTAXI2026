import { Router } from 'express';
import { acceptRide, rejectRide, proposePrice, respondProposal, updatePrice } from '../controllers/ride.controller.js';
import { getPoint } from '../controllers/point.controller.js';
import { getVapidPublic, subscribe, notifyAvailableDrivers, getPushStats, sendPush } from '../controllers/push.controller.js';
import { createDriver } from '../controllers/driver.controller.js';

const router = Router();

// Admin Routes
router.post('/create-driver', createDriver);

// Ride Routes
router.post('/accept-ride', acceptRide);
router.post('/reject-ride', rejectRide);
router.post('/propose-price', proposePrice);
router.post('/respond-proposal', respondProposal);
router.post('/update-price', updatePrice);

// Point Routes
router.get('/point/:id', getPoint);

// Push Routes
router.get('/vapid-public', getVapidPublic);
router.post('/subscribe', subscribe);
router.post('/notify-available-drivers', notifyAvailableDrivers);
router.get('/push-stats', getPushStats);
router.post('/send-push', sendPush);

export default router;
