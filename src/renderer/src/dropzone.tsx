import React from 'react'
import ReactDOM from 'react-dom/client'
import DropZoneApp from './DropZoneApp'
import './styles/global.css'

const rootEl = document.getElementById('dropzone-root')
if (!rootEl) throw new Error('DropZone root element not found')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <DropZoneApp />
  </React.StrictMode>
)
