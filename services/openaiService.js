import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE = 'https://api.openai.com/v1';

// Process text message with OpenAI GPT-4 Turbo or GPT-3.5 Turbo
export async function processTextMessage(text) {
  try {
    const response = await axios.post(
      `${OPENAI_API_BASE}/chat/completions`,
      {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: text }],
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
