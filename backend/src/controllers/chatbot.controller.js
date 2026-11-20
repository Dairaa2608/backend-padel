import { AppError } from '../utils/AppError.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const FREE_MODEL = 'openrouter/free'

const SYSTEM_INSTRUCTION = `Eres el asistente virtual de PadelZone, un club de pádel. Responde en español, con amabilidad y de forma breve.
Ayuda con orientación general sobre reservas, canchas, clases, torneos y productos de la tienda.
No tienes acceso a disponibilidad, precios, pedidos ni datos de usuarios en tiempo real. No inventes precios, horarios, cupos, políticas o confirmaciones; indica al usuario dónde consultar en el sitio o cómo contactar al club.
No solicites contraseñas, datos de tarjetas, códigos de verificación ni documentos de identidad. No afirmes que puedes hacer reservas, compras o cambios en la cuenta.`

export async function sendMessage(req, res) {
  const { messages } = req.body
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new AppError(503, 'CHATBOT_NOT_CONFIGURED', 'Añade OPENROUTER_API_KEY al archivo .env del backend para activar el asistente.')
  }

  let response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: FREE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          ...messages.map(({ role, content }) => ({ role, content })),
        ],
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    console.error('Falló la conexión con OpenRouter para el chatbot.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message.slice(0, 500) : undefined,
    })
    throw new AppError(502, 'CHATBOT_PROVIDER_ERROR', 'No se pudo conectar con el asistente. Intenta de nuevo.')
  }

  let result
  try {
    result = await response.json()
  } catch (error) {
    console.error('OpenRouter devolvió una respuesta inválida para el chatbot.', {
      status: response.status,
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    throw new AppError(502, 'CHATBOT_PROVIDER_ERROR', 'El proveedor devolvió una respuesta inválida. Intenta de nuevo.')
  }

  if (!response.ok) {
    const providerMessage = typeof result?.error?.message === 'string'
      ? result.error.message.slice(0, 500)
      : undefined
    console.error('OpenRouter rechazó la solicitud del chatbot.', {
      status: response.status,
      message: providerMessage,
    })
    if (response.status === 401 || response.status === 403) {
      throw new AppError(502, 'CHATBOT_PROVIDER_AUTH_ERROR', 'OpenRouter rechazó la clave. Revisa OPENROUTER_API_KEY en backend/.env.')
    }
    if (response.status === 429) {
      throw new AppError(429, 'CHATBOT_RATE_LIMIT', 'Se alcanzó el límite gratuito de OpenRouter. Intenta más tarde.')
    }
    throw new AppError(502, 'CHATBOT_PROVIDER_ERROR', 'OpenRouter no pudo generar una respuesta. Intenta de nuevo.')
  }

  const content = result.choices?.[0]?.message?.content
  const reply = typeof content === 'string'
    ? content.trim()
    : Array.isArray(content)
      ? content.filter((part) => part.type === 'text').map((part) => part.text).join('').trim()
      : ''
  if (!reply) {
    throw new AppError(502, 'CHATBOT_EMPTY_RESPONSE', 'El asistente no generó una respuesta. Intenta de nuevo.')
  }

  res.json({ data: { reply } })
}
