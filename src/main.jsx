import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './main.css'
import App from './App.jsx'
import Top from './Top.jsx'
import Bottom from './Bottom.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div className="container">
        <Top />
        <App />
        <Bottom />
      </div>
    </StrictMode>,
)


