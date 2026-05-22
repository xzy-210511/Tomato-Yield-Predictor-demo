import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import InputPage from './pages/InputPage'
import AuthPage from './pages/AuthPage'
import HistoryPage from './pages/HistoryPage'
import GrowthTestPage from './pages/GrowthTestPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/workspace" element={<InputPage />} />
        <Route path="/growth" element={<GrowthTestPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
