import express from 'express';
import dotenv from 'dotenv';
import webhookRouter from './controllers/webhookController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Webhook route
app.use('/webhook', webhookRouter);

// Root route for basic health check
app.get('/', (req, res) => {
  res.send('WhatsApp OpenAI Backend Server is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
