import { Routes, Route } from 'react-router-dom'

// Páginas del celular (jugador)
import IndexPage       from './pages/client/IndexPage'
import RegisterPage    from './pages/client/RegisterPage'
import PrizesPage      from './pages/client/PrizesPage'
import InstructionsPage from './pages/client/InstructionsPage'
import WaitingPage     from './pages/client/WaitingPage'
import ShakePage       from './pages/client/ShakePage'
import ResultPage      from './pages/client/ResultPage'

// Páginas del mall
import AttractPage     from './pages/mall/AttractPage'
import MallWaitingPage from './pages/mall/MallWaitingPage'
import ShakeLivePage   from './pages/mall/ShakeLivePage'
import ResultsMallPage from './pages/mall/ResultsMallPage'

// Páginas del admin
import LoginAdminPage  from './pages/admin/LoginAdminPage'
import DashboardPage   from './pages/admin/DashboardPage'
import ValidatePage    from './pages/admin/ValidatePage'

export default function App() {
  return (
    <Routes>
      {/* Celular del jugador */}
      <Route path="/"             element={<IndexPage />} />
      <Route path="/register"     element={<RegisterPage />} />
      <Route path="/prizes"       element={<PrizesPage />} />
      <Route path="/instructions" element={<InstructionsPage />} />
      <Route path="/waiting"      element={<WaitingPage />} />
      <Route path="/shake"        element={<ShakePage />} />
      <Route path="/result"       element={<ResultPage />} />

      {/* Pantalla del mall */}
      <Route path="/mall"         element={<AttractPage />} />
      <Route path="/mall/waiting" element={<MallWaitingPage />} />
      <Route path="/mall/shake"   element={<ShakeLivePage />} />
      <Route path="/mall/results" element={<ResultsMallPage />} />

      {/* Admin */}
      <Route path="/admin"            element={<LoginAdminPage />} />
      <Route path="/admin/dashboard"  element={<DashboardPage />} />
      <Route path="/admin/validate"   element={<ValidatePage />} />
    </Routes>
  )
}
