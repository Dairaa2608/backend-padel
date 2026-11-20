import { GoogleGenAI } from '@google/genai'
import { AppError } from '../utils/AppError.js'

const SYSTEM_INSTRUCTION = `Eres el asistente virtual de PadelZone, un club de pádel. Responde en español, con amabilidad y de forma breve.
Ayuda con orientación general sobre reservas, canchas, clases, torneos y productos de la tienda.
No tienes acceso a disponibilidad, precios, pedidos ni datos de usuarios en tiempo real. No inventes precios, horarios, cupos, políticas o confirmaciones; indica al usuario dónde consultar en el sitio o cómo contactar al club.
No solicites contraseñas, datos de tarjetas, códigos de verificación ni documentos de identidad. No afirmes que puedes hacer reservas, compras o cambios en la cuenta.`

export async function sendMessage(req, res) {
  const { messages } = req.body
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new AppError(503, 'CHATBOT_NOT_CONFIGURED', 'El asistente aún no está configurado. Añade GEMINI_API_KEY al archivo .env del backend.')
  }

  const client = new GoogleGenAI({ apiKey })
  let interaction
  try {
    interaction = await client.interactions.create({
      model: process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
      input: messages.map(({ role, content }) => ({
        role: role === 'assistant' ? 'model' : 'user',
        parts: [{ text: content }],
      })),
      generation_config: { max_output_tokens: 300 },
      system_instruction: SYSTEM_INSTRUCTION,
      store: false,
    })
  } catch (error) {
    console.error('Falló la solicitud a Gemini para el chatbot.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      status: error?.status,
    })
    throw new AppError(502, 'CHATBOT_PROVIDER_ERROR', 'No se pudo obtener una respuesta del asistente. Intenta de nuevo.')
  }

  const reply = interaction.output_text?.trim()
  if (!reply) {
    throw new AppError(502, 'CHATBOT_EMPTY_RESPONSE', 'El asistente no generó una respuesta. Intenta de nuevo.')
  }

  res.json({ data: { reply } })
}
