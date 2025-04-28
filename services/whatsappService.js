import express from 'express';
import bodyParser from 'body-parser';
import { handleIncomingMessage } from './controllers/webhookController.js'; // Importar la lógica para manejar los mensajes
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar el cuerpo de la solicitud
app.use(bodyParser.json());

// Ruta para manejar las solicitudes de webhook de WhatsApp
app.post('/webhook', async (req, res) => {
  const message = req.body; // El mensaje recibido de WhatsApp

  // Verifica si el mensaje es de un usuario específico
  const userPhone = message?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
  const userText = message?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;

  if (userText) {
    console.log(`Mensaje recibido: ${userText}`);
    const responseText = await handleIncomingMessage(userText);  // Llamada a la función para procesar el mensaje
    await sendMessageToUser(userPhone, responseText);  // Enviar respuesta al usuario
  }

  res.sendStatus(200);
});

// Función para enviar mensajes a WhatsApp
async function sendMessageToUser(phone, message) {
  const url = `https://graph.facebook.com/v14.0/${process.env.WHATSAPP_BUSINESS_PHONE_ID}/messages`;
  const token = process.env.WHATSAPP_ACCESS_TOKEN; // Tu token de acceso de WhatsApp API

  const data = {
    messaging_product: 'whatsapp',
    to: phone,
    text: { body: message }
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Mensaje enviado:', response.data); // Verifica que se ha enviado correctamente
  } catch (error) {
    console.error('Error al enviar mensaje:', error.response?.data || error.message);
  }
}

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});




