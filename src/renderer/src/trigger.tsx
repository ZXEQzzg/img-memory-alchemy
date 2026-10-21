import React from 'react'
import ReactDOM from 'react-dom/client'
import TriggerApp from './TriggerApp'
import './styles/global.css'

const rootEl = document.getElementById('trigger-root')
if (!rootEl) throw new Error('Trigger root element not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <TriggerApp />
  </React.StrictMode>
)
