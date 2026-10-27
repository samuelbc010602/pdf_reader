import { useState, createContext } from "react";
import Toolbar from './components/toolbar/toolbar';
import CustomDocument from './components/document/document';

// Create the context
const DocSpecsContext = createContext();

function App() {
  const [uploadedFile,setUploadedFile] = useState(null);
  const [fileName,setFileName] = useState();
  const [fileType,setFileType] = useState();
  const [signature,setSignature] = useState((false,null));

  return (  
    <DocSpecsContext.Provider value={{ 
      uploadedFile,
      setUploadedFile,
      fileName,
      setFileName,
      fileType,
      setFileType,
      signature,
      setSignature }}>
      <div className="app-container">
        <div className="toolbar-container">
          <Toolbar />
        </div>
        <div className="content-container">
          <CustomDocument />
        </div>
      </div>
    </DocSpecsContext.Provider>
  );
}

export default App;
export { DocSpecsContext }; // Export the context for use in other components