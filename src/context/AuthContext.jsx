import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Buscar token en la URL (Prioridad 1)
    const params = new URLSearchParams(window.location.search);
    let token = params.get('token');

    // 2. Si no está en URL, buscar en LocalStorage (Prioridad 2)
    if (!token) {
      token = localStorage.getItem('sso_token');
    }

    // URL de redirección dinámica
    const REDIRECT_URL = import.meta.env.DEV
      ? "http://localhost:5173"
      : (import.meta.env.VITE_PORTAL_URL || "https://panel-accesos-somyl-production.up.railway.app");

    if (token) {
      try {
        // 3. Decodificar el Token Real
        const decoded = jwtDecode(token);

        // Verificamos si el token ha expirado
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.warn("⚠️ El token ha expirado. Cerrando sesión.");
          localStorage.removeItem('sso_token');
          setUser(null);
          // Redirigir al portal si expiró
          window.location.href = REDIRECT_URL;
        } else {
          // 4. Crear el usuario con datos REALES del Portal
          console.log("🔍 Token Decodificado:", decoded);

          setUser({
            id: decoded.sub,
            // Buscamos el email en los campos estándar o en 'user_email'
            email: decoded.email || decoded.user_email || decoded.sub,
            role: decoded.role || 'authenticated',
            user_metadata: {
              // Si el token trae nombre, úsalo. Si no, usa el email (cortando antes del @)
              full_name: decoded.full_name || (decoded.email ? decoded.email.split('@')[0] : 'Usuario'),
            }
          });
          // Guardamos el token válido
          localStorage.setItem('sso_token', token);
          // Limpiar URL param para que no se vea feo
          if (params.get('token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } catch (error) {
        console.error("🚨 Error al decodificar el token:", error);
        localStorage.removeItem('sso_token');
        setUser(null);
        window.location.href = REDIRECT_URL;
      }
    } else {
      setUser(null);
      // Si no hay token, redirigir al portal
      window.location.href = REDIRECT_URL;
    }

    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('sso_token');
    setUser(null);
    // Redirigir al login del portal principal
    const REDIRECT_URL = import.meta.env.DEV
      ? "http://localhost:5173"
      : (import.meta.env.VITE_PORTAL_URL || "https://panel-accesos-somyl-production.up.railway.app");
    window.location.href = REDIRECT_URL;
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};