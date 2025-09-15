import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Car } from './components/Car'


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Car />} /> 
      </Routes>
    </BrowserRouter>
  )
}

export default App
