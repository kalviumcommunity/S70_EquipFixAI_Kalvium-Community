import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('equipfix_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('equipfix_token'));
  const [loading, setLoading] = useState(() => {
    const savedToken = localStorage.getItem('equipfix_token');
    const savedUser = localStorage.getItem('equipfix_user');
    return !(savedToken && savedUser);
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await authApi.me();
          setUser(res.data);
          localStorage.setItem('equipfix_user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = async (username, password, expectedRole = null) => {
    const res = await authApi.login(username, password, expectedRole);
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('equipfix_token', access_token);
    localStorage.setItem('equipfix_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
    return loggedUser;
  };

  const googleLogin = async (payload) => {
    const res = await authApi.googleLogin(payload);
    const { access_token, user: loggedUser } = res.data;
    localStorage.setItem('equipfix_token', access_token);
    localStorage.setItem('equipfix_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    localStorage.removeItem('equipfix_token');
    localStorage.removeItem('equipfix_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    const userRoleStr = typeof user.role === 'object' ? (user.role.name || '') : String(user.role);
    return allowed.map(r => r.toUpperCase()).includes(userRoleStr.toUpperCase());
  };

  const roleName = user?.role ? (typeof user.role === 'object' ? user.role.name : String(user.role)) : '';
  const userId = user?.id || null;
  const name = user?.full_name || user?.username || '';
  const email = user?.email || '';
  const isAuthenticated = Boolean(token && user);

  const updateUser = (updatedUserData) => {
    setUser(prev => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem('equipfix_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        name,
        email,
        phone: user?.phone || null,
        role: roleName,
        token,
        isAuthenticated,
        loading,
        login,
        googleLogin,
        logout,
        hasRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

