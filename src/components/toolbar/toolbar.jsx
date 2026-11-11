import { useState, useContext, useRef, useEffect } from "react";
import "./toolbar.css";
import OpenFile from "./fileDropDown/openFile";
import DownloadFile from "./fileDropDown/download";
import pdfLogo from "../../assets/pdf_logo.png";
import MergePDF from "./tools/mergePDF";
import OCR from './tools/ocr';
import { DocSpecsContext, AuthContext } from "@/App";
import { SaveFile, SaveFileAs } from './fileDropDown/saveFiles';
import { HTMLPDF, MarkdownPDF, WordPDF } from "./tools/conversionFunctions";
import { NavigationContext } from "@/App";
import Dashboard from "./dashboard/dashboard";
import PageNumbering from "./tools/pageNumbering";
import {
  FolderOpen,
  Download,
  Printer,
  Maximize,
  ShieldCheck,
  Camera,
  FileSignature,
  PenLine,
  Combine,
  ScanText,
  Globe,
  FileText,
  FileType,
  Hash,
  FilePlus,
  FileJson,
  Save,
} from "lucide-react";
import MakeSignature from './signatureDropDown/makeSignature'


export default function Toolbar() {
  const {
    uploadedFile,
    setUploadedFile,
    setFileName,
    setFileType,
    toOpen,setToOpen,
    toClose,setToClose,
    toPrint,setToPrint,
    toExport,setToExport,
    toFullscreen,setToFullscreen,
    toProtect,setToProtect,
    toCapture,setToCapture,
    newPdf,setNewPdf
  } = useContext(DocSpecsContext);

  const triggerPdfEditor = (action) => {
    window.dispatchEvent(
      new Event(`pdf-editor:${action}`)
    );
  };

  const {user,setUser} = useContext(AuthContext);
  const {
    activePage,
    previousPage,
    navigateTo,
    showLogin
  } = useContext(NavigationContext);

  const [active, setActive] = useState(null);
  const [showSignaturePopup, setShowSignaturePopup] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogin) return;
  
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setActive(null);
      }
    };
  
    document.addEventListener("mousedown", handleClickOutside);
  
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLogin]);

  function DropdownItem({ icon: Icon, children, onClick }) {
    return (
      <button className="dropdown-item" onClick={onClick}>
        <Icon size={17} strokeWidth={1.8} />
        <span>{children}</span>
      </button>
    );
  }
  
  function getDropdown(tab) {
    switch (tab) {
      case "files":
        return (
          <div className="dropdown-menu">

            {!newPdf && (
              <DropdownItem
                icon={FilePlus}
                onClick={() => setNewPdf(true)}
              >
                New
              </DropdownItem>
            )}

            {newPdf && (
              <>
                <DropdownItem
                  icon={FilePlus}
                  onClick={() => triggerPdfEditor("new")}
                >
                  New
                </DropdownItem>

                <DropdownItem
                  icon={FolderOpen}
                  onClick={() => triggerPdfEditor("open-template")}
                >
                  Open template
                </DropdownItem>

                <DropdownItem
                  icon={Save}
                  onClick={() => triggerPdfEditor("save-template")}
                >
                  Save template
                </DropdownItem>

                <DropdownItem
                  icon={Download}
                  onClick={() => triggerPdfEditor("export")}
                >
                  Download PDF
                </DropdownItem>
              </>
            )}

            <DropdownItem
              icon={FolderOpen}
              onClick={() =>
                OpenFile({
                  setUploadedFile,
                  setFileName,
                  setFileType,
                  setNewPdf
                })
              }
            >
              Open
            </DropdownItem>

            {!newPdf && uploadedFile && (
              <>
                <DropdownItem
                  icon={Download}
                  onClick={() => setToExport(toExport + 1)}
                >
                  Download
                </DropdownItem>

                <DropdownItem
                  icon={Printer}
                  onClick={() => setToPrint(toPrint + 1)}
                >
                  Print
                </DropdownItem>
              </>
            )}

          </div>
        );

  
      case "tools":
        return (
          <div className="dropdown-menu">
            <MergePDF
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
              setFileName={setFileName}
              setFileType={setFileType}
            />
  
            <OCR
              setUploadedFile={setUploadedFile}
              setFileName={setFileName}
              setFileType={setFileType}
            />
  
            <HTMLPDF
              setUploadedFile={setUploadedFile}
              setFileName={setFileName}
              setFileType={setFileType}
            />
  
            <MarkdownPDF
              setUploadedFile={setUploadedFile}
              setFileName={setFileName}
              setFileType={setFileType}
            />
  
            <WordPDF />
  
            <PageNumbering
              setUploadedFile={setUploadedFile}
              setFileName={setFileName}
              setFileType={setFileType}
            />
          </div>
        );
      default:
        return null;
    }
  }
  
  return (
    <>
      <div className="toolbar_box" ref={dropdownRef}>
        <img src={pdfLogo} className="logo" />
  
        <div className="toolbar_item">
          <button
            className={`toolbar_button ${active === "files" ? "active" : ""}`}
            onClick={() => setActive(active === "files" ? null : "files")}
          >
            Files
          </button>
          {active === "files" && getDropdown("files")}
        </div>
  
        {(uploadedFile || newPdf) && (
          <div className="toolbar_item">
             <MakeSignature
            setUploadedFile={setUploadedFile}
            setFileName={setFileName}
            setFileType={setFileType}
            uploadedFile={uploadedFile}
            />
          </div>
        )}
  
        {!newPdf && (
          <div className="toolbar_item">
            <button
              className={`toolbar_button ${active === "tools" ? "active" : ""}`}
              onClick={() => setActive(active === "tools" ? null : "tools")}
            >
              Tools
            </button>
            {active === "tools" && getDropdown("tools")}
          </div>
        )}
        {uploadedFile && (
        <div className="toolbar_item">
        <button
          className={`toolbar_button ${active === "tools" ? "active" : ""}`}
          icon={ShieldCheck}
          onClick={() => setToProtect(toProtect + 1)}
        >
          Protect
        </button>
        </div>
        )}

        {uploadedFile && (
        <div className="toolbar_item">
        <button
          className={`toolbar_button ${active === "tools" ? "active" : ""}`}
          icon={Camera}
          onClick={() => setToCapture(toCapture + 1)}
        >
          Capture
        </button>
        </div>
        )}

        {uploadedFile && (
        <div className="toolbar_item">
        <button
          className={`toolbar_button ${active === "tools" ? "active" : ""}`}
          icon={Maximize}
          onClick={() => setToFullscreen(toFullscreen + 1)}
        >
          Fullscreen
        </button>
        </div>
        )}

      <div className="toolbar_item">
      <button
  className={`toolbar_button ${activePage === "dashboard" ? "active" : ""}`}
  onClick={() =>
    navigateTo("dashboard", { requiresAuth: true })
  }
>
  Dashboard
</button>
      </div>


      </div>
    </>
  );

}