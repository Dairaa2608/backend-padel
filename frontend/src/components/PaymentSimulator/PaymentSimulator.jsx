import { useState } from 'react'
import './PaymentSimulator.css'

const METHODS = [
  { value: 'CARD', label: 'Tarjeta', icon: 'credit_card' },
  { value: 'PSE', label: 'PSE', icon: 'account_balance' },
  { value: 'CASH', label: 'Efectivo', icon: 'payments' },
]

const BANKS = ['Bancolombia', 'Davivienda', 'Banco de Bogotá', 'Nequi', 'Otro banco']

export default function PaymentSimulator({
  method,
  onMethodChange,
  outcome,
  onOutcomeChange,
  cashLabel = 'Efectivo (pago pendiente)',
  cashDescription = 'La operación quedará pendiente de pago en efectivo.',
}) {
  const [bank, setBank] = useState(BANKS[0])

  return (
    <section className="payment-simulator" aria-label="Simulador de pago">
      <div className="payment-simulator-methods" role="radiogroup" aria-label="Método de pago">
        {METHODS.map((option) => (
          <label
            className={`payment-simulator-method ${method === option.value ? 'active' : ''}`}
            key={option.value}
          >
            <input
              type="radio"
              name="simulated-payment-method"
              value={option.value}
              checked={method === option.value}
              onChange={() => onMethodChange(option.value)}
            />
            <i className="material-icons" aria-hidden="true">{option.icon}</i>
            <span>{option.value === 'CASH' ? cashLabel : option.label}</span>
          </label>
        ))}
      </div>

      {method === 'CARD' && (
        <div className="payment-simulator-panel">
          <div className="payment-simulator-heading">
            <i className="material-icons" aria-hidden="true">credit_card</i>
            <div>
              <strong>Simulador de tarjeta</strong>
              <p>No ingreses datos reales: elige el resultado de prueba.</p>
            </div>
          </div>
          <label className="payment-simulator-field">
            Resultado de la transacción
            <select value={outcome} onChange={(event) => onOutcomeChange(event.target.value)}>
              <option value="APPROVED">Aprobada</option>
              <option value="DECLINED">Rechazada</option>
            </select>
          </label>
        </div>
      )}

      {method === 'PSE' && (
        <div className="payment-simulator-panel">
          <div className="payment-simulator-heading">
            <i className="material-icons" aria-hidden="true">account_balance</i>
            <div>
              <strong>Simulador PSE</strong>
              <p>Selecciona un banco de prueba; no se abrirá ni autenticará una cuenta bancaria.</p>
            </div>
          </div>
          <label className="payment-simulator-field">
            Banco
            <select value={bank} onChange={(event) => setBank(event.target.value)}>
              {BANKS.map((bankName) => <option key={bankName}>{bankName}</option>)}
            </select>
          </label>
          <label className="payment-simulator-field">
            Resultado de la transacción
            <select value={outcome} onChange={(event) => onOutcomeChange(event.target.value)}>
              <option value="APPROVED">Aprobada</option>
              <option value="DECLINED">Rechazada</option>
            </select>
          </label>
        </div>
      )}

      {method === 'CASH' && (
        <div className="payment-simulator-panel payment-simulator-cash">
          <i className="material-icons" aria-hidden="true">info</i>
          <p>{cashDescription}</p>
        </div>
      )}

      <p className="payment-simulator-disclaimer">
        <i className="material-icons" aria-hidden="true">verified_user</i>
        Simulación local: no se realiza un cobro ni se guardan datos financieros.
      </p>
    </section>
  )
}
