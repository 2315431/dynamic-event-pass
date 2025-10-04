import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Ticket from './pages/Ticket'
import Validator from './pages/Validator'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ticket" element={<Ticket />} />
        <Route path="/validator" element={<Validator />} />
      </Routes>
    </div>
  )
}

export default App
