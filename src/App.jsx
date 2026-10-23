import { useState, useEffect } from "react";
import Top from './Top.jsx'
import Bottom from './Bottom.jsx'
import Toolbar from './components/toolbar/toolbar'
import CustomDocument from './components/document/document'

function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toCheck,setCheck] = useState(false);
  const [initial,setInitial] = useState(false)

  useEffect(() =>{
    if (initial == false){
      setInitial(true);
      return;
    }
    const controller = new AbortController();
    console.log("the checker change");

    async function getDocuments() {
      const response = await fetch('/api/documents');
      if (!response.ok){
        throw new Error("Response from flask failed");
      }
      const data = await response.json()
      setDocuments(data)
    }

    getDocuments()

    return () => controller.abort();

  },[toCheck]);


  return (  
    <div>
    <Top></Top>
    <Toolbar></Toolbar>
    <CustomDocument></CustomDocument>
    <Bottom></Bottom>
    </div>
  );
}

export default App;