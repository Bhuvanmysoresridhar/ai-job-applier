import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import HeroSection from './components/HeroSection'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import ResumePage from './pages/ResumePage'
import JobsPage from './pages/JobsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import EmailsPage from './pages/EmailsPage'

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HeroSection />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/profile/setup" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardHome /></DashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/resume" element={<ProtectedRoute><DashboardLayout><ResumePage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/jobs" element={<ProtectedRoute><DashboardLayout><JobsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/applications" element={<ProtectedRoute><DashboardLayout><ApplicationsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/emails" element={<ProtectedRoute><DashboardLayout><EmailsPage /></DashboardLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
