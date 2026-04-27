import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/useAuth';
import { SedeProvider } from './utils/useSede';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ChangePasswordModal from './components/ChangePasswordModal';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import PatientsPage from './pages/PatientsPage';
import PetDetailPage from './pages/PetDetailPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ClinicalHistoryPage from './pages/ClinicalHistoryPage';
import VaccinesPage from './pages/VaccinesPage';
import PetGuardianshipPage from './pages/PetGuardianshipPage';
import GroomingPage from './pages/GroomingPage';
import HospitalizationPage from './pages/HospitalizationPage';
import LaboratoriosPage from './pages/LaboratoriosPage';
import RemissionsPage from './pages/RemissionsPage';
import EPSPage from './pages/EPSPage';
import DocumentsPage from './pages/DocumentsPage';
import UsersPage from './pages/UsersPage';
import ImportPage from './pages/ImportPage';
import PrepagadaPage from './pages/PrepagadaPage';
import HCRequestsPage from './pages/HCRequestsPage';
import CertificadosViajePage from './pages/CertificadosViajePage';
import PortalPage from './pages/PortalPage';
import RemisionesPage from './pages/RemisionesPage';

function ProtectedLayout({ children }) {
  const { session } = useAuth();
  return (
    <SedeProvider session={session}>
      <div className="app-layout">
        <Sidebar />
        <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main className="main-content" style={{ paddingTop: 'calc(var(--navbar-height) + 2rem)' }}>
            {children}
          </main>
        </div>
        {/* First-login password wall */}
        {session?.mustChangePassword && <ChangePasswordModal />}
      </div>
    </SedeProvider>
  );
}

function AppRoutes() {
  const { session } = useAuth();
  const isAdmin     = session?.rol === 'Administrador';

  if (!session) {
    return (
      <Routes>
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/login"  element={<LoginPage />} />
        <Route path="*"       element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/portal" element={<PortalPage />} />
      <Route path="/login"  element={<Navigate to="/" />} />

      <Route path="/"                  element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/clients"           element={<ProtectedLayout><ClientsPage /></ProtectedLayout>} />
      <Route path="/clients/:id"       element={<ProtectedLayout><ClientDetailPage /></ProtectedLayout>} />
      <Route path="/patients"          element={<ProtectedLayout><PatientsPage /></ProtectedLayout>} />
      <Route path="/patients/:id"      element={<ProtectedLayout><PetDetailPage /></ProtectedLayout>} />
      <Route path="/appointments"      element={<ProtectedLayout><AppointmentsPage /></ProtectedLayout>} />
      <Route path="/clinical-history"  element={<ProtectedLayout><ClinicalHistoryPage /></ProtectedLayout>} />
      <Route path="/vaccines"          element={<ProtectedLayout><VaccinesPage /></ProtectedLayout>} />
      <Route path="/petguardianship"   element={<ProtectedLayout><PetGuardianshipPage /></ProtectedLayout>} />
      <Route path="/grooming"          element={<ProtectedLayout><GroomingPage /></ProtectedLayout>} />
      <Route path="/hospitalization"   element={<ProtectedLayout><HospitalizationPage /></ProtectedLayout>} />
      <Route path="/laboratorios"      element={<ProtectedLayout><LaboratoriosPage /></ProtectedLayout>} />
      <Route path="/remissions"        element={<ProtectedLayout><RemissionsPage /></ProtectedLayout>} />
      <Route path="/eps"               element={<ProtectedLayout><EPSPage /></ProtectedLayout>} />
      <Route path="/documents"          element={<ProtectedLayout><DocumentsPage /></ProtectedLayout>} />
      <Route path="/prepagada"          element={<ProtectedLayout><PrepagadaPage /></ProtectedLayout>} />
      <Route path="/remisiones"         element={<ProtectedLayout><RemisionesPage /></ProtectedLayout>} />

      {/* Admin-only */}
      {isAdmin && (
        <>
          <Route path="/users"                element={<ProtectedLayout><UsersPage /></ProtectedLayout>} />
          <Route path="/import"               element={<ProtectedLayout><ImportPage /></ProtectedLayout>} />
          <Route path="/hc-requests"          element={<ProtectedLayout><HCRequestsPage /></ProtectedLayout>} />
          <Route path="/certificados-viaje"   element={<ProtectedLayout><CertificadosViajePage /></ProtectedLayout>} />
        </>
      )}

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
