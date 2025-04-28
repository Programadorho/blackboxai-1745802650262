import axios from 'axios';
import { processTextMessage, processAudioMessage, processImageMessage } from './openaiService.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_MY_NUMBER = process.env.WHATSAPP_MY_NUMBER;

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v17.0';

// Verify webhook for GET challenge
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
}

// Handle incoming webhook POST events
export async function handleIncomingMessage(req, res) {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entry = body.entry && body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const messages = value && value.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from;

   

    if (message.type === 'text') {
      const text = message.text.body;
      const responseText = await processTextMessage(text);
      await sendTextMessage(from, responseText);
    } else if (message.type === 'audio' || message.type === 'voice') {
      const mediaId = message.audio?.id || message.voice?.id;
      if (mediaId) {
        const audioPath = await downloadMedia(mediaId, 'audio');
        const transcription = await processAudioMessage(audioPath);
        const responseText = await processTextMessage(transcription);
        await sendTextMessage(from, responseText);
        // Clean up downloaded file
        fs.unlink(audioPath, (err) => {
          if (err) console.error('Error deleting audio file:', err);
        });
      }
    } else if (message.type === 'image') {
      const mediaId = message.image?.id;
      if (mediaId) {
        const imagePath = await downloadMedia(mediaId, 'image');
        const responseText = await processImageMessage(imagePath);
        await sendTextMessage(from, responseText);
        // Clean up downloaded file
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Error deleting image file:', err);
        });
      }
    } else {
      console.log(`Unsupported message type: ${message.type}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling incoming message:', error);
    res.sendStatus(500);
  }
}

// Download media file from WhatsApp servers
async function downloadMedia(mediaId, type) {
  try {
    // Get media URL
    const urlResponse = await axios.get(
      `${WHATSAPP_API_BASE}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      }
    );
    const mediaUrl = urlResponse.data.url;

    // Get media file
    const mediaResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      responseType: 'stream',
    });

    // Save to temp file
    const ext = type === 'audio' ? '.ogg' : '.jpg';
    const filePath = path.resolve(`./temp_${mediaId}${ext}`);
    const writer = fs.createWriteStream(filePath);

    mediaResponse.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
}

// Send text message back to WhatsApp user
export async function sendTextMessage(to, text) {
  try {
    const url = `${WHATSAPP_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const data = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    };
    const headers = {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
    await axios.post(url, data, { headers });
  } catch (error) {
    console.error('Error sending text message:', error);
  }
}
