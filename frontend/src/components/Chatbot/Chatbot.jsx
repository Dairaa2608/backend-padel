import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import './Chatbot.css'

const GREETING = '¡Hola! Soy el asistente de PadelZone. ¿En qué puedo ayudarte?'
const SUGGESTIONS = ['Reservar una cancha', 'Ver clases', 'Consultar torneos', 'Productos de la tienda']

function getRecentMessages(messages, newMessage) {
  const recent = [...messages, newMessage].slice(-12)
  return recent[0]?.role === 'assistant' ? recent.slice(1) : recent
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen, messages, sending, error])

  const sendMessage = async (value) => {
    const content = value.trim()
    if (!content || sending) return

    const userMessage = { role: 'user', content }
    const previousMessages = messages
    const conversation = getRecentMessages(previousMessages, userMessage)
    setMessages([...previousMessages, userMessage])
    setSending(true)
    setError('')

    try {
      const { reply } = await api.sendChatMessage(conversation)
      setMessages([...previousMessages, userMessage, { role: 'assistant', content: reply }])
      setDraft('')
    } catch (requestError) {
      setMessages(previousMessages)
      setError(requestError.message)
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(draft)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(draft)
    }
  }

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <section className="chatbot-panel" role="dialog" aria-modal="false" aria-labelledby="chatbot-title">
          <header className="chatbot-header">
            <div className="chatbot-brand-icon"><i className="material-icons" aria-hidden="true">sports_tennis</i></div>
            <div className="chatbot-header-copy">
              <h2 id="chatbot-title">Asistente PadelZone</h2>
              <span>Asistente con IA · Gemini</span>
            </div>
            <button className="chatbot-header-button" type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
              <i className="material-icons" aria-hidden="true">close</i>
            </button>
          </header>

          <div className="chatbot-messages" aria-live="polite">
            <div className="chatbot-message chatbot-message-assistant">{GREETING}</div>
            {messages.map((message, index) => (
              <div
                className={`chatbot-message ${message.role === 'user' ? 'chatbot-message-user' : 'chatbot-message-assistant'}`}
                key={`${index}-${message.role}`}
              >
                {message.content}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="chatbot-suggestions" aria-label="Preguntas sugeridas">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} disabled={sending}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {sending && <div className="chatbot-message chatbot-message-assistant chatbot-typing" role="status">Escribiendo…</div>}
            {error && <p className="chatbot-error" role="alert">{error}</p>}
            <div ref={endRef} />
          </div>

          <form className="chatbot-composer" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje…"
              aria-label="Mensaje para el asistente"
              rows={1}
              maxLength={2000}
              disabled={sending}
            />
            <button type="submit" aria-label="Enviar mensaje" disabled={sending || !draft.trim()}>
              <i className="material-icons" aria-hidden="true">send</i>
            </button>
          </form>
          <p className="chatbot-disclaimer">Asistente con IA Gemini. No compartas datos personales.</p>
        </section>
      )}

      <button
        className="chatbot-launcher"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Cerrar asistente' : 'Abrir asistente'}
        aria-expanded={isOpen}
      >
        <i className="material-icons" aria-hidden="true">{isOpen ? 'close' : 'chat'}</i>
      </button>
    </div>
  )
}
