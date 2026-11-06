import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('padelzone_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.email?.toLowerCase() === 'admin@padelzone.com') {
          parsed.rol = 'admin';
          localStorage.setItem('padelzone_user', JSON.stringify(parsed));
        }
        setUser(parsed);
      }
    } catch {}
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    try { localStorage.setItem('padelzone_user', JSON.stringify(userData)); } catch {}
  };

  const loginWithCredentials = async (email, password) => {
    const data = await api.login({ email, password });
    // data: { token, user }
    const userData = { ...(data.user || {}), token: data.token };
    login(userData);
    return userData;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    const userData = { ...(data.user || {}), token: data.token };
    login(userData);
    return userData;
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('padelzone_user');
      localStorage.removeItem('padelzone_cart');
    } catch {}
  };

  const value = {
    user,
    login,
    loginWithCredentials,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
    token: user?.token || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
