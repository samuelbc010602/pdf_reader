import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './main.css'
import Landing from './Landing'

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div className="container">
      <Landing />
      </div>
    </StrictMode>,
)


