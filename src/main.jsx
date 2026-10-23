import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './main.css'
import App from './App.jsx'
import { TooltipProvider } from "@/components/ui/tooltip"

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div className="container">
      <TooltipProvider>
        <App />
      </TooltipProvider>
      </div>
    </StrictMode>,
)


