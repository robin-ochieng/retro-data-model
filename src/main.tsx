import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Help from './pages/Help';
import Wizard from './pages/wizard/Wizard';
import './index.css';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
  <Route path="/help" element={<Help />} />
        <Route path="/wizard/:lob/:submissionId/*" element={<Wizard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
