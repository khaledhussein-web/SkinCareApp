  
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/app/components/ui/sonner';
import { SkinCareProvider } from '@/app/context/SkinCareContext';
import { AuthProvider } from '@/app/context/AuthContext';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { Navbar } from '@/app/components/Navbar';
import { HomeScreen } from '@/app/screens/HomeScreen';
import { DashboardScreen } from '@/app/screens/DashboardScreen';
import { ContactScreen } from '@/app/screens/ContactScreen';
import { FeedbackScreen } from '@/app/screens/FeedbackScreen';
import { LoginScreen } from '@/app/screens/LoginScreen';
import { RegisterScreen } from '@/app/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/app/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/app/screens/ResetPasswordScreen';
import { AdminDashboardScreen } from '@/app/screens/AdminDashboardScreen';
import { QuestionnaireScreen } from '@/app/screens/QuestionnaireScreen';
import { UploadScreen } from '@/app/screens/UploadScreen';
import { AnalyzingScreen } from '@/app/screens/AnalyzingScreen';
import { ResultsScreen } from '@/app/screens/ResultsScreen';
import { ChatScreen } from '@/app/screens/ChatScreen';
import ProgressTrackingScreen from '@/app/screens/ProgressTrackingScreen';
import { ProfileScreen } from '@/app/screens/user/ProfileScreen';
import { HistoryScreen } from '@/app/screens/user/HistoryScreen';

export default function App() {
  return (
    <AuthProvider>
      <SkinCareProvider>
        <Router>
          <div className="min-h-screen">
            <Navbar />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeScreen />} />
              <Route path="/contact" element={<ContactScreen />} />
              <Route path="/feedback" element={<FeedbackScreen />} />
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/register" element={<RegisterScreen />} />
              <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
              <Route path="/reset-password" element={<ResetPasswordScreen />} />
              
              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/questionnaire"
                element={
                  <ProtectedRoute>
                    <QuestionnaireScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analyzing"
                element={
                  <ProtectedRoute>
                    <AnalyzingScreen />
                  </ProtectedRoute>
                }              />
              <Route
                path="/results"
                element={
                  <ProtectedRoute>
                    <ResultsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress-tracking"
                element={
                  <ProtectedRoute>
                    <ProgressTrackingScreen />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboardScreen />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </SkinCareProvider>
    </AuthProvider>
  );
}

