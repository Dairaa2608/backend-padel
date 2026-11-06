import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Inicialización inteligente: revisa localStorage y si no existe, toma preferencia del sistema
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('padelzone_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      // Detección automática según configuración del navegador
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback
    }
    return 'light';
  });

  // Aplicar tema en el elemento raíz (document.documentElement)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
    try {
      localStorage.setItem('padelzone_theme', theme);
    } catch {}
  }, [theme]);

  // Escuchar cambios automáticos del sistema si el usuario no forzó manualmente un tema
  useEffect(() => {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const userSelectedTheme = localStorage.getItem('padelzone_theme_manual');
      // Solo cambiar automáticamente si el usuario no ha forzado uno manualmente
      if (!userSelectedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('padelzone_theme_manual', 'true');
      } catch {}
      return next;
    });
  };

  const setAutoTheme = () => {
    try {
      localStorage.removeItem('padelzone_theme_manual');
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setAutoTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

