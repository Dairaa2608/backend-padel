// Modo claro / oscuro (traído del trabajo de mi compañero).
// Si la persona pulsa el botón, se recuerda su elección en el navegador.
// Si nunca lo pulsó, se usa el tema del sistema (y se sigue si cambia).
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

const THEME_KEY = 'padelzone_theme' // solo se guarda cuando la persona elige a mano

// localStorage puede fallar (modo incógnito, bloqueado...): en ese caso se ignora
const storage = {
  get: (key) => {
    try { return localStorage.getItem(key) } catch { return null }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value) } catch { /* sin almacenamiento: no se recuerda */ }
  },
  remove: (key) => {
    try { localStorage.removeItem(key) } catch { /* sin almacenamiento */ }
  },
}

const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const savedTheme = () => {
  const saved = storage.get(THEME_KEY)
  return saved === 'dark' || saved === 'light' ? saved : null
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => savedTheme() ?? systemTheme())

  // Aplica el tema en <html data-theme="dark">: dark-mode.css hace el resto
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark-mode', theme === 'dark')
  }, [theme])

  // Si la persona no eligió a mano, sigue los cambios del sistema
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const handleChange = (e) => {
      if (!savedTheme()) setTheme(e.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  // Botón de la barra: cambia el tema y lo recuerda
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    storage.set(THEME_KEY, next)
    setTheme(next)
  }

  // Volver a seguir el tema del sistema
  const setAutoTheme = () => {
    storage.remove(THEME_KEY)
    setTheme(systemTheme())
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setAutoTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return context
}
