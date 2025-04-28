import express from 'express';
import { handleIncomingMessage, verifyWebhook } from '../services/whatsappService.js';

const router = express.Router();

// Webhook verification endpoint (GET)
router.get('/', (req, res) => {
  verifyWebhook(req, res);
});

// Webhook event handler (POST)
router.post('/', (req, res) => {
  handleIncomingMessage(req, res);
});

export default router;
