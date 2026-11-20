import './Contact.css'

// Abre el asistente con IA (el botón verde flotante, components/Chatbot)
const openChatbot = () => window.dispatchEvent(new Event('padelzone:abrir-chat'))

function Contact() {
  return (
    <div className="contact-page">

      {/* HEADER */}
      <div className="contact-header">
        <div className="container">
          <h1>Contacto</h1>
          <p>
            Estamos aquí para ayudarte.
            Escríbenos o visítanos
          </p>
        </div>
      </div>

      <div className="container contact-body">

        <div className="contact-grid">

          {/* INFO */}
          <div className="contact-info">

            <div className="contact-info-card">

              <h5>Información de Contacto</h5>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="material-icons">location_on</i>
                </div>
                <div>
                  <p className="contact-info-label">Dirección</p>
                  <p className="contact-info-value">Calle Pádel 123, Neiva, Huila, Colombia</p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="material-icons">phone</i>
                </div>
                <div>
                  <p className="contact-info-label">Teléfono</p>
                  <p className="contact-info-value">+57 300 000 0000</p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="material-icons">email</i>
                </div>
                <div>
                  <p className="contact-info-label">Email</p>
                  <p className="contact-info-value">info@padelzone.com</p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="material-icons">schedule</i>
                </div>
                <div>
                  <p className="contact-info-label">Horarios</p>
                  <p className="contact-info-value">Lunes – Domingo: 7:00 AM – 11:00 PM</p>
                </div>
              </div>

            </div>


          </div>

          {/* MAPA Y ASISTENTE */}
          <div className="contact-side">

            <div className="contact-map-card">
              <iframe
                title="Ubicación PadelZone"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63735.40500877451!2d-75.33!3d2.93!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3b6f5b5b5b5b5b%3A0x0!2sNeiva%2C+Huila!5e0!3m2!1ses!2sco!4v1234567890"
                width="100%"
                height="220"
                style={{ border: 0, borderRadius: '12px' }}
                allowFullScreen=""
                loading="lazy"
              />
            </div>

            <div className="contact-assistant-card">
              <div className="contact-info-icon">
                <i className="material-icons">smart_toy</i>
              </div>
              <div>
                <h5>¿Tienes preguntas?</h5>
                <p>Nuestro asistente con IA conoce las canchas, horarios, clases, torneos y productos del club.</p>
                <button type="button" className="contact-assistant-btn" onClick={openChatbot}>
                  <i className="material-icons">chat</i>
                  Hablar con el asistente
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Contact