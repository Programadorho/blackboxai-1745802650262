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

// 🧠 Manejo de sesiones en archivo JSON
const SESSIONS_FILE = './sessions.json';
let sessions = {};

// Cargar sesiones si existen
if (fs.existsSync(SESSIONS_FILE)) {
  const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
  sessions = JSON.parse(data);
  console.log('✅ Sesiones cargadas desde sessions.json');
}

// Función para guardar sesiones en archivo
function saveSessions() {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

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
      sessions[from] = {
        history: [], // Array para almacenar los mensajes
        greeted: false,
        askedIfMember: false, // Nuevo estado
        isMember: null, // Para guardar la respuesta sobre la membresía
      };
    }

    console.log(`ℹ️ Estado de la sesión de ${from} al recibir mensaje:`, sessions[from]);

    // Capturar mensaje recibido
    const userMessage = message.text?.body?.toLowerCase() || '[Contenido no textual recibido]';
    sessions[from].history.push({ type: 'received', message: userMessage });
    saveSessions(); // Guardar inmediatamente después de recibir el mensaje

    // Saludar solo la primera vez
    if (!sessions[from].greeted) {
      const greeting = "¡Hola! 👋 Soy *Mario*, agente del equipo de **Hernán Oviedo**. Estoy aquí para acompañarte en tu proceso como parte de nuestro programa *Negocios Híbridos* 🚀.\n\nMi misión es ayudarte a llevar tu negocio físico al mundo digital, paso a paso y de manera efectiva. ¡Vamos a hacerlo juntos!";
      await sendTextMessage(from, greeting);
      sessions[from].history.push({ type: 'sent', message: greeting });
      sessions[from].greeted = true;
      saveSessions(); // Guardar inmediatamente después de saludar
      console.log(`ℹ️ Se saludó a ${from}, nuevo estado de greeted:`, sessions[from].greeted);
    }

    // Preguntar sobre la membresía solo una vez
    if (!sessions[from].askedIfMember) {
      const membershipQuestion = "¿Ya perteneces al programa *Negocios Híbridos* de Hernán Oviedo? 🎯";
      await sendTextMessage(from, membershipQuestion);
      sessions[from].history.push({ type: 'sent', message: membershipQuestion });
      sessions[from].askedIfMember = true;
      saveSessions(); // Guardar inmediatamente después de preguntar por la membresía
      console.log(`ℹ️ Se preguntó a ${from} sobre la membresía, nuevo estado de askedIfMember:`, sessions[from].askedIfMember);
      return res.sendStatus(200); // Cortar aquí para la respuesta a la pregunta de membresía
    }

    // Lógica para manejar la respuesta a la pregunta de membresía
    if (sessions[from].askedIfMember && sessions[from].isMember === null) {
      const lowerUserMessage = userMessage.toLowerCase().trim();
      if (lowerUserMessage === 'si' || lowerUserMessage === 'sí') {
        sessions[from].isMember = true;
        const congratsMessage = "¡Excelente decisión de transformar tu negocio! 🚀 ¿En qué paso te encuentras actualmente? Cuéntame para sugerirte algunas tareas sencillas para seguir avanzando. 😉";
        await sendTextMessage(from, congratsMessage);
        sessions[from].history.push({ type: 'sent', message: congratsMessage });
        saveSessions();
        return res.sendStatus(200);
      } else if (lowerUserMessage === 'no') {
        sessions[from].isMember = false;
        const invitationMessage = "¡Entiendo! 😊 Te invito a unirte a nuestro programa *Negocios Híbridos* y comenzar a llevar tu negocio al mundo digital con nuestro acompañamiento personalizado, clases grabadas y sesiones en vivo para resolver todas tus dudas. ¡Es el momento de dar el salto! 🚀 ¿Te gustaría saber más sobre cómo unirte?";
        await sendTextMessage(from, invitationMessage);
        sessions[from].history.push({ type: 'sent', message: invitationMessage });
        saveSessions();
        return res.sendStatus(200);
      } else {
        // Si la respuesta no es clara, puedes dar una pequeña aclaración
        const clarificationMessage = "Por favor, responde 'sí' o 'no' si ya perteneces al programa *Negocios Híbridos* de Hernán Oviedo. 🎯";
        await sendTextMessage(from, clarificationMessage);
        sessions[from].history.push({ type: 'sent', message: clarificationMessage });
        saveSessions();
        return res.sendStatus(200);
      }
    }

    // Procesamiento normal del mensaje (después de manejar la pregunta de membresía)
    try {
      if (message.type === 'text') {
        const responseText = await processTextMessage(userMessage, sessions[from].history); // Pasar el historial
        await sendTextMessage(from, responseText);
        sessions[from].history.push({ type: 'sent', message: responseText });
        saveSessions(); // Guardar después de enviar la respuesta
      } else if (message.type === 'audio' || message.type === 'voice') {
        const mediaId = message.audio?.id || message.voice?.id;
        if (mediaId) {
          const audioPath = await downloadMedia(mediaId, 'audio');
          const transcription = await processAudioMessage(audioPath, sessions[from].history); // Pasar el historial
          const responseText = await processTextMessage(transcription, sessions[from].history); // Pasar el historial
          await sendTextMessage(from, responseText);
          sessions[from].history.push({ type: 'sent', message: responseText });
          saveSessions(); // Guardar después de enviar la respuesta al audio
          fs.unlink(audioPath, (err) => {
            if (err) console.error('Error deleting audio file:', err);
          });
        }
      } else if (message.type === 'image') {
        const mediaId = message.image?.id;
        if (mediaId) {
          const imagePath = await downloadMedia(mediaId, 'image');
          const responseText = await processImageMessage(imagePath, sessions[from].history); // Pasar el historial
          await sendTextMessage(from, responseText);
          sessions[from].history.push({ type: 'sent', message: responseText });
          saveSessions(); // Guardar después de enviar la respuesta a la imagen
          fs.unlink(imagePath, (err) => {
            if (err) console.error('Error deleting image file:', err);
          });
        }
      } else {
        console.log(`ℹ️ Unsupported message type received: ${message.type}`);
        const unsupportedMessage = '👋 Hola, por ahora solo puedo procesar mensajes de texto, audios e imágenes.';
        await sendTextMessage(from, unsupportedMessage);
        sessions[from].history.push({ type: 'sent', message: unsupportedMessage });
        saveSessions(); // Guardar después de enviar el mensaje de no soportado
      }
    } catch (processingError) {
      console.error('🚨 Error during message processing:', processingError);
      const errorMessage = '⚠️ Hubo un problema procesando tu mensaje. Intenta nuevamente más tarde.';
      await sendTextMessage(from, errorMessage);
      sessions[from].history.push({ type: 'sent', message: errorMessage });
      saveSessions(); // Guardar después de enviar el mensaje de error
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


