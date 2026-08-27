import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.tsx'
import MatrixBackground from './components/MatrixBackground'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app-shell">
      <MatrixBackground />
      <main className="app-content">
        <App />
      </main>
    </div>
  </StrictMode>,
)
