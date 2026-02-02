import { AuthProvider } from './context/AuthContext'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import EmployeeList from './pages/EmployeeList'
import JobSettings from './pages/JobSettings'
import DepartmentSettings from './pages/DepartmentSettings'
import AbsenceManagement from './pages/AbsenceManagement'
import BalanceSettings from './pages/BalanceSettings'
import SubcontractorSettings from './pages/SubcontractorSettings'
import CourseSettings from './pages/CourseSettings'
import ShiftSettings from './pages/ShiftSettings'
import EmployeePortal from './pages/EmployeePortal'
import AttendanceControl from './pages/AttendanceControl'
import PayrollSettings from './pages/PayrollSettings'
import PayrollGenerator from './pages/PayrollGenerator'
import AFPSettings from './pages/AFPSettings';
import LREGenerator from './pages/LREGenerator';
import PerformanceReviews from './pages/PerformanceReviews';
import OrgChart from './pages/OrgChart';
import './index.css'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen font-sans text-slate-900">
        <BrowserRouter>
          <Routes>
            {/* ==================== RUTAS PÚBLICAS / KIOSCO ==================== */}
            {/* El reloj control no lleva el Layout administrativo */}
            <Route path="/clock" element={<EmployeePortal />} />

            {/* ==================== RUTAS ADMINISTRATIVAS CON LAYOUT ==================== */}
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/employees" element={<Layout><EmployeeList /></Layout>} />

            {/* Módulo Asistencia */}
            <Route path="/attendance" element={<Layout><AttendanceControl /></Layout>} />

            {/* Módulo Ausencias */}
            <Route path="/absences" element={<Layout><AbsenceManagement /></Layout>} />

            {/* Módulo Nómina */}
            <Route path="/payroll/settings" element={<Layout><PayrollSettings /></Layout>} />
            <Route path="/payroll/process" element={<Layout><PayrollGenerator /></Layout>} />
            <Route path="/payroll/lre" element={<Layout><LREGenerator /></Layout>} />
            <Route path="/reviews" element={<Layout><PerformanceReviews /></Layout>} />
            <Route path="/org-chart" element={<OrgChart />} /> {/* Added OrgChart route */}

            {/* Configuraciones */}
            <Route path="/settings/jobs" element={<Layout><JobSettings /></Layout>} />
            <Route path="/settings/departments" element={<Layout><DepartmentSettings /></Layout>} />
            <Route path="/settings/shifts" element={<Layout><ShiftSettings /></Layout>} />
            <Route path="/settings/subcontractors" element={<Layout><SubcontractorSettings /></Layout>} />
            <Route path="/settings/courses" element={<Layout><CourseSettings /></Layout>} />
            <Route path="/settings/balances" element={<Layout><BalanceSettings /></Layout>} />
            <Route path="/settings/afp" element={<Layout><AFPSettings /></Layout>} />

            {/* ==================== FALLBACK ==================== */}
            <Route path="*" element={<Layout><Dashboard /></Layout>} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  )
}

export default App