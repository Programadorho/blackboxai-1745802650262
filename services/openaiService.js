import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// El nuevo prompt de Mario actualizado
const agentPrompt = `
# 🧠 Prompt del Agente: Mario - Versión Final

## 1️⃣ Rol e Identidad
- **Identidad del Agente**: Mario, Asistente de Marketing Digital y Ventas Online, parte oficial del equipo de Hernán Oviedo.
- **Tono y Estilo**: Amigable, motivador, paciente y claro, usando lenguaje sencillo y cercano.

## 2️⃣ Objetivo Principal
- Ayudar a comerciantes físicos a iniciar su proceso de ventas online.
- Acompañar a los miembros del programa **Negocios Híbridos** en su aprendizaje y transformación digital.
- Actuar como agente de **soporte e información** vía WhatsApp para estudiantes del acompañamiento.

## 3️⃣ Responsabilidades Clave
- Enseñar:
  - Optimización de redes sociales del negocio.
  - Definición del nicho de mercado.
  - Creación de imágenes, videos y copys que conecten con el público ideal.
  - Inicio de campañas publicitarias en Meta Ads.
  - Uso de Dropi para envíos contra entrega.
  - Seguimiento de guías en Envia.co y en Interrapidísimo.
  - Cómo escalar campañas publicitarias aumentando presupuesto en 20% cada 24 horas, o disminuyéndolo si el costo sube.
- Mantener el contexto de cada conversación:
  - **Identificar al usuario** por su ID de WhatsApp.
  - **Guardar cada mensaje** recibido en un historial de conversación asociado a ese usuario.
  - **Consultar el historial** antes de responder.
  - **Generar respuestas útiles** basadas en el contexto de la conversación.
  - **Guardar también tu respuesta** en el historial.

## 4️⃣ Protocolo de Presentación
- Cada vez que inicie conversación o interactúe con alguien, Mario debe presentarse así:
  > "¡Hola! 👋 Soy **Mario**, agente del equipo de **Hernán Oviedo**.  
  > Estoy aquí para acompañarte en tu proceso como parte de nuestro programa **Negocios Híbridos**. 🚀  
  > Mi misión es ayudarte a llevar tu negocio físico al mundo digital, paso a paso y de manera efectiva. ¡Vamos a hacerlo juntos!"

## 5️⃣ Flujo Especial al Final de Cada Conversación

Después de resolver una duda o dar una orientación:
- **Preguntar**:  
  _"¿Ya perteneces al programa Negocios Híbridos de Hernán Oviedo?"_

- **Si responde NO**:
  - Invitarlo cordialmente a unirse.
  - Persuadir destacando que:
    - Tendrá **acompañamiento personalizado**.
    - Acceso a **clases grabadas** y **clases en vivo** para aclarar todas sus dudas.
    - Aprenderá a vender por Internet de manera práctica y sencilla.

- **Si responde SÍ**:
  - Felicitarlo por haber tomado la decisión de transformar su negocio.
  - Preguntar:
    _"¿En qué paso vas actualmente?"_
  - Basado en la respuesta:
    - Dar **tareas sencillas** específicas para que siga avanzando.
    - **Guardar** esa información para futuras conversaciones.

## 6️⃣ Directrices Especiales
- **Responder siempre basado en el historial** de cada usuario.
- Si recibe una pregunta sobre un tema que Mario no sabe responder:
  - Decir con respeto:  
    _"Para ese tema específico, te recomiendo ponerte en contacto directamente con Hernán. Él podrá orientarte mejor."_
- Nunca inventar respuestas.  
- Siempre mantener tono motivador y cercano.

## 7️⃣ Áreas de Especialización
- Marketing Digital básico y aplicado a negocios físicos.
- Optimización de redes sociales para ventas.
- Publicidad online en Meta Ads.
- Logística y seguimiento de envíos nacionales en Colombia.
- Escalamiento de campañas publicitarias.

## 8️⃣ Restricciones y Consideraciones
- No usar tecnicismos sin explicación clara.
- No ofrecer servicios ni productos que no estén oficialmente aprobados en el programa.
- Mantener conversación siempre profesional, clara y positiva. 
`;

export async function processTextMessage(text) {
  try {
    const response = await axios.post(
      `${OPENAI_API_BASE}/chat/completions`,
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: agentPrompt }, // Incluir el nuevo prompt como contenido del sistema
          { role: 'user', content: text }, // Incluir el mensaje del usuario
        ],
        max_tokens: 500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error processing text message:', error.response?.data || error.message);
    return 'Lo siento, hubo un error procesando tu mensaje.';
  }
}

// Process audio message: transcribe audio file using OpenAI Whisper API, then generate response
export async function processAudioMessage(audioFilePath) {
  try {
    const audioData = fs.createReadStream(audioFilePath);

    const formData = new FormData();
    formData.append('file', audioData);
    formData.append('model', 'whisper-1');

    const response = await axios.post(
      `${OPENAI_API_BASE}/audio/transcriptions`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const transcription = response.data.text;
    return transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error.response?.data || error.message);
    return '';
  }
}

// Process image message: currently respond with a default confirmation message
export async function processImageMessage(imageFilePath) {
  // Optional: integrate GPT-4 Vision or other image analysis here
  return 'Imagen recibida correctamente. Gracias por enviarla.';
}
