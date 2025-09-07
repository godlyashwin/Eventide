import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import DayDetails from './DayDetails.jsx';
import Settings from './Settings.jsx';
import { PaletteProvider } from './PaletteContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PaletteProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/day-details" element={<DayDetails />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </PaletteProvider>
  </React.StrictMode>
);