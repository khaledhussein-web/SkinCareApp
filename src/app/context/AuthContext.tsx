import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock authentication - in production, this would call a real API
    if (email === 'admin@skincare.com' && password === 'admin123') {
      const adminUser: User = {
        id: 'admin-1',
        email: 'admin@skincare.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      setUser(adminUser);
      localStorage.setItem('user', JSON.stringify(adminUser));
    } else if (password.length >= 6) {
      // Any email with password >= 6 chars works for demo
      const regularUser: User = {
        id: `user-${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      setUser(regularUser);
      localStorage.setItem('user', JSON.stringify(regularUser));
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock registration
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const forgotPassword = async (email: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // In production, this would send a real email with reset link
    console.log(`Password reset link sent to ${email}`);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // In production, this would verify the token and update the password
    console.log('Password reset successful');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
