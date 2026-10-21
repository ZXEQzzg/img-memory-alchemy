import React from 'react'
import ReactDOM from 'react-dom/client'
import RevealApp from './RevealApp'
import './styles/global.css'

const rootEl = document.getElementById('reveal-root')
if (!rootEl) throw new Error('Reveal root element not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RevealApp />
  </React.StrictMode>
)
