// Formularios del panel (crear / editar). Diseño de Admin.css (trabajo de mi compañero).
// Cada formulario convierte los datos de la API a campos del formulario y, al guardar, al revés.
import { useState } from 'react'
import { DAY_NAMES, splitList } from './adminHelpers'

const TITLES = {
  courts: 'Cancha',
  products: 'Producto',
  tournaments: 'Torneo',
  classes: 'Programa de Clases',
  users: 'Usuario',
}

export default function AdminModal({ resource, item, onClose, onSave }) {
  const Form = FORMS[resource]
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (payload) => {
    setError('')
    setSaving(true)
    try {
      await onSave(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay-pro" onClick={onClose}>
      <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-pro">
          <h3>{item ? 'Editar' : 'Nuevo'} {TITLES[resource]}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">&times;</button>
        </div>
        <Form item={item} onSubmit={submit} onCancel={onClose} saving={saving} error={error} />
      </div>
    </div>
  )
}

/* ── Piezas comunes ───────────────────────────────── */

function Field({ label, children, hint }) {
  return (
    <div className="form-field-pro">
      <label>{label}</label>
      {children}
      {hint && <small className="admin-hint">{hint}</small>}
    </div>
  )
}

function Check({ id, label, checked, onChange }) {
  return (
    <div className="form-field-pro admin-check">
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

function Footer({ onCancel, saving, error, label = 'Guardar' }) {
  return (
    <>
      {error && <p className="admin-form-error">{error}</p>}
      <div className="modal-footer-pro">
        <button type="button" className="btn-secondary-pro" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-admin-action-primary" disabled={saving}>
          {saving ? 'Guardando…' : label}
        </button>
      </div>
    </>
  )
}

// Estado del formulario + función para cambiar un campo
function useForm(initial) {
  const [form, setForm] = useState(initial)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }))
  return [form, set, setForm]
}

/* ── Cancha ───────────────────────────────────────── */

function CourtForm({ item, onSubmit, ...footer }) {
  const [f, set] = useForm({
    name: item?.name ?? '',
    type: item?.type ?? 'OUTDOOR',
    pricePerHour: item?.pricePerHour ?? 100000,
    description: item?.description ?? '',
    features: (item?.features ?? []).join(', '),
    imageUrl: item?.imageUrl ?? '',
    active: item?.active ?? true,
  })

  const submit = (e) => {
    e.preventDefault()
    onSubmit({ ...f, pricePerHour: Number(f.pricePerHour), features: splitList(f.features) })
  }

  return (
    <form onSubmit={submit}>
      <div className="modal-body-pro">
        <Field label="Nombre"><input required value={f.name} onChange={set('name')} placeholder="Cancha Central" /></Field>
        <div className="form-grid-2">
          <Field label="Tipo">
            <select value={f.type} onChange={set('type')}>
              <option value="OUTDOOR">Exterior</option>
              <option value="INDOOR">Interior</option>
            </select>
          </Field>
          <Field label="Precio por hora ($)">
            <input type="number" min="1" required value={f.pricePerHour} onChange={set('pricePerHour')} />
          </Field>
        </div>
        <Field label="Descripción"><textarea required rows="2" value={f.description} onChange={set('description')} /></Field>
        <Field label="Características" hint="Separadas por comas: Iluminación LED, Vestuarios">
          <input value={f.features} onChange={set('features')} />
        </Field>
        <Field label="Imagen (URL, opcional)" hint="Si se deja vacío, se usa la foto de la cancha por su nombre">
          <input value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
        </Field>
        <Check id="court-active" label="Activa (aparece en la web y se puede reservar)" checked={f.active} onChange={set('active')} />
      </div>
      <Footer {...footer} label="Guardar cancha" />
    </form>
  )
}

/* ── Producto ─────────────────────────────────────── */

function ProductForm({ item, onSubmit, ...footer }) {
  const [f, set] = useForm({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price ?? 50000,
    stock: item?.stock ?? 10,
    badge: item?.badge ?? '',
    imageUrl: item?.imageUrl ?? '',
    active: item?.active ?? true,
  })

  const submit = (e) => {
    e.preventDefault()
    onSubmit({ ...f, price: Number(f.price), stock: Number(f.stock) })
  }

  return (
    <form onSubmit={submit}>
      <div className="modal-body-pro">
        <Field label="Nombre"><input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Descripción"><textarea required rows="2" value={f.description} onChange={set('description')} /></Field>
        <div className="form-grid-2">
          <Field label="Precio ($)"><input type="number" min="1" required value={f.price} onChange={set('price')} /></Field>
          <Field label="Stock (unidades)"><input type="number" min="0" required value={f.stock} onChange={set('stock')} /></Field>
        </div>
        <Field label="Etiqueta">
          <select value={f.badge} onChange={set('badge')}>
            <option value="">Ninguna</option>
            <option value="Nuevo">Nuevo</option>
            <option value="Oferta">Oferta</option>
            <option value="Destacado">Destacado</option>
          </select>
        </Field>
        <Field label="Imagen (URL, opcional)"><input value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://…" /></Field>
        <Check id="product-active" label="Activo (aparece en la tienda)" checked={f.active} onChange={set('active')} />
      </div>
      <Footer {...footer} label="Guardar producto" />
    </form>
  )
}

/* ── Torneo ───────────────────────────────────────── */

function TournamentForm({ item, onSubmit, ...footer }) {
  const [f, set] = useForm({
    name: item?.name ?? '',
    description: item?.description ?? '',
    startDate: item?.startDate ?? '',
    endDate: item?.endDate ?? '',
    category: item?.category ?? 'Amateur',
    level: item?.level ?? 'Todos los niveles',
    location: item?.location ?? 'Todas las canchas',
    fee: item?.fee ?? 30000,
    prize: item?.prize ?? 500000,
    capacity: item?.capacity ?? 16,
    imageUrl: item?.imageUrl ?? '',
  })

  const submit = (e) => {
    e.preventDefault()
    onSubmit({ ...f, fee: Number(f.fee), prize: Number(f.prize), capacity: Number(f.capacity) })
  }

  return (
    <form onSubmit={submit}>
      <div className="modal-body-pro">
        <Field label="Nombre"><input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Descripción"><textarea required rows="2" value={f.description} onChange={set('description')} /></Field>
        <div className="form-grid-2">
          <Field label="Fecha de inicio"><input type="date" required value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label="Fecha de fin"><input type="date" required value={f.endDate} onChange={set('endDate')} /></Field>
        </div>
        <div className="form-grid-2">
          <Field label="Categoría">
            <select value={f.category} onChange={set('category')}>
              <option value="Profesional">Profesional</option>
              <option value="Amateur">Amateur</option>
              <option value="Comunidad">Comunidad</option>
            </select>
          </Field>
          <Field label="Nivel"><input required value={f.level} onChange={set('level')} /></Field>
        </div>
        <Field label="Lugar"><input required value={f.location} onChange={set('location')} /></Field>
        <div className="form-grid-2">
          <Field label="Inscripción ($)"><input type="number" min="0" required value={f.fee} onChange={set('fee')} /></Field>
          <Field label="Premio ($)"><input type="number" min="0" required value={f.prize} onChange={set('prize')} /></Field>
        </div>
        <Field label="Cupos" hint={item ? `Inscritos ahora: ${item.registeredCount ?? 0}` : undefined}>
          <input type="number" min={Math.max(1, item?.registeredCount ?? 0)} required value={f.capacity} onChange={set('capacity')} />
        </Field>
      </div>
      <Footer {...footer} label="Guardar torneo" />
    </form>
  )
}

/* ── Programa de clases (con sus grupos) ─────────── */

const emptyGroup = { minAge: 18, maxAge: '', coachName: '', coachTitle: '', monthlyPrice: 180000, capacity: 10 }

function ClassForm({ item, onSubmit, ...footer }) {
  const [f, set, setForm] = useForm({
    name: item?.name ?? '',
    type: item?.type ?? 'Regular',
    description: item?.description ?? '',
    weekdays: item?.weekdays ?? [1, 3, 5],
    scheduleSlots: (item?.scheduleSlots ?? ['6:00 PM']).join(', '),
    sessionHours: item?.sessionHours ?? 2,
    hoursPerWeek: item?.hoursPerWeek ?? 6,
    color: item?.color ?? '#1a73e8',
    active: item?.active ?? true,
    groups: item?.groups?.map((g) => ({
      _id: g._id,
      minAge: g.minAge,
      maxAge: g.maxAge ?? '',
      coachName: g.coach?.name ?? '',
      coachTitle: g.coach?.title ?? '',
      monthlyPrice: g.monthlyPrice,
      capacity: g.capacity,
      enrolledCount: g.enrolledCount ?? 0,
    })) ?? [{ ...emptyGroup }],
  })

  const toggleDay = (d) =>
    setForm((p) => ({ ...p, weekdays: p.weekdays.includes(d) ? p.weekdays.filter((x) => x !== d) : [...p.weekdays, d] }))
  const setGroup = (i, field) => (e) =>
    setForm((p) => ({ ...p, groups: p.groups.map((g, j) => (j === i ? { ...g, [field]: e.target.value } : g)) }))
  const addGroup = () => setForm((p) => ({ ...p, groups: [...p.groups, { ...emptyGroup }] }))
  const removeGroup = (i) => setForm((p) => ({ ...p, groups: p.groups.filter((_, j) => j !== i) }))

  const submit = (e) => {
    e.preventDefault()
    onSubmit({
      name: f.name,
      type: f.type,
      description: f.description,
      weekdays: f.weekdays,
      scheduleSlots: splitList(f.scheduleSlots),
      sessionHours: Number(f.sessionHours),
      hoursPerWeek: Number(f.hoursPerWeek),
      color: f.color,
      active: f.active,
      groups: f.groups.map((g) => ({
        ...(g._id && { _id: g._id }),
        minAge: Number(g.minAge),
        maxAge: g.maxAge === '' ? null : Number(g.maxAge),
        coachName: g.coachName,
        coachTitle: g.coachTitle,
        monthlyPrice: Number(g.monthlyPrice),
        capacity: Number(g.capacity),
      })),
    })
  }

  return (
    <form onSubmit={submit}>
      <div className="modal-body-pro">
        <div className="form-grid-2">
          <Field label="Nombre"><input required value={f.name} onChange={set('name')} /></Field>
          <Field label="Tipo"><input required value={f.type} onChange={set('type')} placeholder="Regular, Intensiva…" /></Field>
        </div>
        <Field label="Descripción"><textarea required rows="2" value={f.description} onChange={set('description')} /></Field>

        <Field label="Días de clase">
          <div className="admin-days">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button type="button" key={d} className={`admin-day ${f.weekdays.includes(d) ? 'active' : ''}`} onClick={() => toggleDay(d)}>
                {DAY_NAMES[d].slice(0, 3)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Horarios" hint="Separados por comas: 8:00 AM, 6:00 PM">
          <input required value={f.scheduleSlots} onChange={set('scheduleSlots')} />
        </Field>
        <div className="form-grid-2">
          <Field label="Horas por clase"><input type="number" min="1" required value={f.sessionHours} onChange={set('sessionHours')} /></Field>
          <Field label="Horas por semana"><input type="number" min="1" required value={f.hoursPerWeek} onChange={set('hoursPerWeek')} /></Field>
        </div>
        <div className="form-grid-2">
          <Field label="Color"><input type="color" value={f.color} onChange={set('color')} /></Field>
          <Check id="class-active" label="Activo (aparece en la web)" checked={f.active} onChange={set('active')} />
        </div>

        <div className="admin-groups-title">
          <span>Grupos por edad</span>
          <button type="button" className="btn-secondary-pro" onClick={addGroup}>+ Añadir grupo</button>
        </div>
        {f.groups.map((g, i) => (
          <div className="admin-group-box" key={g._id ?? `nuevo-${i}`}>
            <div className="admin-group-head">
              <strong>Grupo {i + 1}</strong>
              {g.enrolledCount > 0 && <small>{g.enrolledCount} inscritos</small>}
              {f.groups.length > 1 && (
                <button type="button" className="btn-icon-subtle danger" onClick={() => removeGroup(i)} title="Quitar grupo">
                  <i className="material-icons">delete</i>
                </button>
              )}
            </div>
            <div className="form-grid-2">
              <Field label="Edad mínima"><input type="number" min="0" required value={g.minAge} onChange={setGroup(i, 'minAge')} /></Field>
              <Field label="Edad máxima" hint="Vacío = en adelante">
                <input type="number" min="0" value={g.maxAge} onChange={setGroup(i, 'maxAge')} />
              </Field>
            </div>
            <div className="form-grid-2">
              <Field label="Profesor"><input required value={g.coachName} onChange={setGroup(i, 'coachName')} /></Field>
              <Field label="Cargo del profesor"><input value={g.coachTitle} onChange={setGroup(i, 'coachTitle')} /></Field>
            </div>
            <div className="form-grid-2">
              <Field label="Precio mensual ($)"><input type="number" min="1" required value={g.monthlyPrice} onChange={setGroup(i, 'monthlyPrice')} /></Field>
              <Field label="Cupos"><input type="number" min={Math.max(1, g.enrolledCount ?? 0)} required value={g.capacity} onChange={setGroup(i, 'capacity')} /></Field>
            </div>
          </div>
        ))}
      </div>
      <Footer {...footer} label="Guardar programa" />
    </form>
  )
}

/* ── Usuario ──────────────────────────────────────── */

function UserForm({ item, onSubmit, ...footer }) {
  const [f, set] = useForm({
    name: item?.name ?? '',
    email: item?.email ?? '',
    phone: item?.phone ?? '',
    role: item?.role ?? 'USER',
    password: '',
  })

  const submit = (e) => {
    e.preventDefault()
    const { password, ...data } = f
    // Al editar, la contraseña solo se cambia si se escribe una nueva
    onSubmit(password ? { ...data, password } : data)
  }

  return (
    <form onSubmit={submit}>
      <div className="modal-body-pro">
        <Field label="Nombre completo"><input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input type="email" required value={f.email} onChange={set('email')} /></Field>
        <div className="form-grid-2">
          <Field label="Teléfono"><input value={f.phone} onChange={set('phone')} placeholder="3001234567" /></Field>
          <Field label="Rol">
            <select value={f.role} onChange={set('role')}>
              <option value="USER">Cliente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>
        </div>
        <Field label={item ? 'Nueva contraseña (opcional)' : 'Contraseña'} hint={item ? 'Déjala vacía para no cambiarla' : 'Mínimo 6 caracteres'}>
          <input type="password" minLength={6} required={!item} value={f.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
      </div>
      <Footer {...footer} label="Guardar usuario" />
    </form>
  )
}

const FORMS = {
  courts: CourtForm,
  products: ProductForm,
  tournaments: TournamentForm,
  classes: ClassForm,
  users: UserForm,
}
