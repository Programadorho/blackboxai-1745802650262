# WhatsApp OpenAI Backend

This is a Node.js backend server using Express.js that integrates WhatsApp Business Cloud API with OpenAI APIs. It receives WhatsApp messages via webhook, processes text, audio, and image messages using OpenAI, and sends automated responses back to WhatsApp.

## Features

- Webhook to receive WhatsApp Business Cloud API messages
- Validates and processes messages only from a specific WhatsApp number
- Handles text, audio (transcription), and image messages
- Uses OpenAI GPT-4 Turbo for text generation
- Uses OpenAI Whisper API for audio transcription
- Sends responses back via WhatsApp API
- Modular and clean code structure
- Environment variables for sensitive credentials
- Ready for deployment on Railway or Render

## Project Structure

- `app.js`: Main entry point
- `controllers/webhookController.js`: Handles webhook routes
- `services/whatsappService.js`: WhatsApp API integration (media download, send messages)
- `services/openaiService.js`: OpenAI API integration (text, audio transcription, image handling)
- `.env.example`: Example environment variables file

## Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file based on `.env.example` and fill in your credentials
4. Start the server with `npm start` or `npm run dev` (requires nodemon)

## Environment Variables

- `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp Business Cloud phone number ID
- `WHATSAPP_ACCESS_TOKEN`: Access token for WhatsApp API
- `WHATSAPP_VERIFY_TOKEN`: Token to verify webhook
- `WHATSAPP_MY_NUMBER`: Your personal WhatsApp number in international format
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Port to run the server (default 3000)

## Deploying on Railway (Free Tier)

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository or deploy manually
3. Set environment variables in Railway project settings (same as `.env`)
4. Railway will automatically detect the Node.js app and install dependencies
5. Start the server (default command: `npm start`)
6. Configure your WhatsApp webhook URL to point to `https://your-railway-url/webhook`

## Notes

- This server only responds to incoming messages from your configured WhatsApp number
- No user authentication or proactive messaging implemented
- Uses only Express and Axios for simplicity

## License

MIT
