import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'
import './styles/rentivo.css'
import './styles/marketplace.css'
import './styles/auth.css'
import './styles/renter-mobile.css'
import './styles/admin.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import './styles/dark-mode-fixes.css'
import './styles/dark-mode-marketplace.css'
import './styles/dark-mode-checkout.css'
import './styles/dark-mode-inspection.css'
import './styles/dark-mode-portals.css'
import './styles/dark-mode-auth-legal.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
