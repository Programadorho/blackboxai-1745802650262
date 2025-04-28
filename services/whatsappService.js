import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar el cuerpo de la solicitud
app.use(bodyParser.json());

// Variables de entorno (asegúrate de configurar estas en el archivo .env)
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_BUSINESS_PHONE_ID = process.env.WHATSAPP_BUSINESS_PHONE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_PHONE_NUMBER = 'your_personal_number'; // Tu número personal de WhatsApp

// Ruta para verificar el webhook (requerida por Meta)
app.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (token === WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Error, invalid token');
  }
});

// Ruta para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  const message = req.body.entry[0].changes[0].value.messages[0];
  const userPhone = message.from;
  const userText = message.text?.body;
  const messageType = message.type;

  // Verificar que el mensaje provenga de tu número personal
  if (userPhone !== WHATSAPP_PHONE_NUMBER) {
    return res.sendStatus(200);
  }

  // Si el mensaje es de tipo texto
  if (userText) {
    const responseText = await generateResponseFromOpenAI(userText);
    await sendMessageToUser(userPhone, responseText);
  }

  // Si el mensaje es de tipo audio
  if (messageType === 'audio') {
    const audioUrl = message.audio.url;
    const transcribedText = await transcribeAudioWithWhisper(audioUrl);
    const responseText = await generateResponseFromOpenAI(transcribedText);
    await sendMessageToUser(userPhone, responseText);
  }

  // Si el mensaje es de tipo imagen
  if (messageType === 'image') {
    const imageUrl = message.image.url;
    await downloadMedia(imageUrl); // Descarga la imagen y luego responde
    await sendMessageToUser(userPhone, 'Imagen recibida, ¡gracias!');
  }

  res.sendStatus(200);
});

// Función para generar respuesta con OpenAI (GPT)
const generateResponseFromOpenAI = async (userText) => {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: userText }],
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
};

// Función para transcribir audio usando Whisper
const transcribeAudioWithWhisper = async (audioUrl) => {
  const audioResponse = await axios.get(audioUrl, { responseType: 'stream' });
  const audioBuffer = audioResponse.data;

  const formData = new FormData();
  formData.append('file', audioBuffer);
  formData.append('model', 'whisper-1');

  const transcribeResponse = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
    }
  );

  return transcribeResponse.data.text;
};

// Función para enviar mensajes a WhatsApp
const sendMessageToUser = async (phone, message) => {
  const url = `https://graph.facebook.com/v14.0/${WHATSAPP_BUSINESS_PHONE_ID}/messages`;

  const data = {
    messaging_product: 'whatsapp',
    to: phone,
    text: { body: message },
  };

  await axios.post(url, data, {
    headers: {
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
};

// Descargar archivo multimedia de WhatsApp (audio, imagen, etc.)
const downloadMedia = async (mediaUrl) => {
  const mediaResponse = await axios.get(mediaUrl, { responseType: 'stream' });

  const writer = fs.createWriteStream('./downloaded_media');
  mediaResponse.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve('Archivo descargado correctamente.'));
    writer.on('error', reject);
  });
};

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});




