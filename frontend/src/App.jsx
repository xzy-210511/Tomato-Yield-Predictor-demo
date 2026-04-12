import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import InputPage from './pages/InputPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<InputPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
