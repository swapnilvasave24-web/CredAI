import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ApplicantDashboard from './pages/ApplicantDashboard';
import FinancialAssessment from './pages/FinancialAssessment';
import CreditResult from './pages/CreditResult';
import AssessmentHistory from './pages/AssessmentHistory';
import Profile from './pages/Profile';
import InstitutionDashboard from './pages/InstitutionDashboard';
import FederatedTrainingView from './pages/FederatedTrainingView';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function withLayout(el: React.ReactNode) {
  return <AppLayout>{el}</AppLayout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Applicant */}
            <Route path="/dashboard" element={
              <ProtectedRoute allow={['APPLICANT']}>{withLayout(<ApplicantDashboard />)}</ProtectedRoute>
            } />
            <Route path="/assessment" element={
              <ProtectedRoute allow={['APPLICANT']}>{withLayout(<FinancialAssessment />)}</ProtectedRoute>
            } />
            <Route path="/result/:id" element={
              <ProtectedRoute allow={['APPLICANT']}>{withLayout(<CreditResult />)}</ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute allow={['APPLICANT']}>{withLayout(<AssessmentHistory />)}</ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute allow={['APPLICANT']}>{withLayout(<Profile />)}</ProtectedRoute>
            } />

            {/* Institution */}
            <Route path="/institution" element={
              <ProtectedRoute allow={['INSTITUTION']}>{withLayout(<InstitutionDashboard />)}</ProtectedRoute>
            } />
            <Route path="/institution/federated" element={
              <ProtectedRoute allow={['INSTITUTION']}>{withLayout(<FederatedTrainingView />)}</ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allow={['ADMIN']}>{withLayout(<AdminDashboard />)}</ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
