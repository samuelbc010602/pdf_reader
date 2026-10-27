import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './main.css'
import Landing from './Landing'
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById('root')).render(
    <StrictMode>
      <div className="container">
      <TooltipProvider>
        <Landing />
      </TooltipProvider>
      </div>
    </StrictMode>,
)


