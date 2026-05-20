import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Studio from './pages/Studio'
import Watch from './pages/Watch'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="/watch/:sessionId" element={<Watch />} />
      </Routes>
    </BrowserRouter>
  )
}
