import axios from 'axios';
import { processTextMessage, processAudioMessage, processImageMessage } from './openaiService.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v17.0';

// 🧠 Memoria de sesiones
const sessions = {}; 
// Estructura: { "numero_usuario": { greeted: true/false, history: [{ type: 'sent'/'received', message: 'texto' }] } }

// Verify webhook for GET challenge
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook verification failed');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
}

// Handle incoming webhook POST events
export async function handleIncomingMessage(req, res) {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      console.warn('⚠️ Received unknown object type');
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      console.log('ℹ️ No messages found');
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from;

    console.log(`📨 Received message from: ${from} - Type: ${message.type}`);

    // Inicializar sesión si no existe
    if (!sessions[from]) {
      sessions[from] = { greeted: false, history: [] };
    }

    // Guardar mensaje recibido en historial
    const userMessage = message.text?.body || '[Contenido no textual recibido]';
    sessions[from].history.push({ type: 'received', message: userMessage });

    // Saludar solo una vez
    if (!sessions[from].greeted) {
      const greeting = "¡Hola! 👋 Soy *Mario*, agente del equipo de **Hernán Oviedo**. Estoy aquí para acompañarte en tu proceso como parte de nuestro programa *Negocios Híbridos* 🚀.\n\nMi misión es ayudarte a llevar tu negocio físico al mundo digital, paso a paso y de manera efectiva. ¡Vamos a hacerlo juntos!";
      await sendTextMessage(from, greeting);
      sessions[from].greeted = true;
      sessions[from].history.push({ type: 'sent', message: greeting });
    }

    try {
      if (message.type === 'text') {
        const responseText = await processTextMessage(userMessage);
        await sendTextMessage(from, responseText);
        sessions[from].history.push({ type: 'sent', message: responseText });

      } else if (message.type === 'audio' || message.type === 'voice') {
        const mediaId = message.audio?.id || message.voice?.id;
        if (mediaId) {
          const audioPath = await downloadMedia(mediaId, 'audio');
          const transcription = await processAudioMessage(audioPath);
          const responseText = await processTextMessage(transcription);
          await sendTextMessage(from, responseText);
          sessions[from].history.push({ type: 'sent', message: responseText });
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
          sessions[from].history.push({ type: 'sent', message: responseText });
          fs.unlink(imagePath, (err) => {
            if (err) console.error('Error deleting image file:', err);
          });
        }
      } else {
        console.log(`ℹ️ Unsupported message type received: ${message.type}`);
        const unsupportedMessage = '👋 Hola, por ahora solo puedo procesar mensajes de texto, audios e imágenes.';
        await sendTextMessage(from, unsupportedMessage);
        sessions[from].history.push({ type: 'sent', message: unsupportedMessage });
      }
    } catch (processingError) {
      console.error('🚨 Error during message processing:', processingError);
      const errorMessage = '⚠️ Hubo un problema procesando tu mensaje. Intenta nuevamente más tarde.';
      await sendTextMessage(from, errorMessage);
      sessions[from].history.push({ type: 'sent', message: errorMessage });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('🚨 Error handling incoming webhook:', error);
    res.sendStatus(500);
  }
}

// Download media file from WhatsApp servers
async function downloadMedia(mediaId, type) {
  try {
    console.log(`⬇️ Downloading media ID: ${mediaId}`);
    
    const urlResponse = await axios.get(
      `${WHATSAPP_API_BASE}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      }
    );
    const mediaUrl = urlResponse.data.url;

    const mediaResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      responseType: 'stream',
    });

    const ext = type === 'audio' ? '.ogg' : '.jpg';
    const filePath = path.resolve(`/tmp/temp_${mediaId}${ext}`);
    const writer = fs.createWriteStream(filePath);

    mediaResponse.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('🚨 Error downloading media:', error);
    throw error;
  }
}

// Send text message back to WhatsApp user
export async function sendTextMessage(to, text) {
  try {
    console.log(`✉️ Sending message to ${to}: ${text}`);

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
    console.error('🚨 Error sending text message:', error.response?.data || error.message);
  }
}
