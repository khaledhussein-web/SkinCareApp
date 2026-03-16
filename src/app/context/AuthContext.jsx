import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL, apiFetch } from "../services/api";

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("auth_token");
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_error) {
        localStorage.removeItem("user");
        localStorage.removeItem("auth_token");
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("auth_token");
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("auth_token", data.token);
    return data.user;
  };

  const register = async (name, email, password, gender, dateOfBirth, phoneNumber) => {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { name, email, password, gender, dateOfBirth, phoneNumber },
    });

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("auth_token", data.token);
    return data.user;
  };

  const logout = () => {
    fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("auth_token");
  };

  const forgotPassword = async (email) => {
    await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  };

  const resetPassword = async (token, newPassword) => {
    await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: { token, newPassword },
    });
  };

  const value = {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
