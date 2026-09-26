import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('stocksense_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on app launch
  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.user);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (login_id, password) => {
    const data = await api.post('/auth/login', { login_id, password });
    localStorage.setItem('stocksense_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (login_id, email, password, role, name) => {
    const data = await api.post('/auth/register', { login_id, email, password, role, name });
    localStorage.setItem('stocksense_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('stocksense_token');
    setToken(null);
    setUser(null);
  };

  const requestOtp = async (email) => {
    return await api.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (email, otp, newPassword) => {
    return await api.post('/auth/reset-password', { email, otp, newPassword });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        requestOtp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
