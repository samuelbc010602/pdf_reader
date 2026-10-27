import { useState, useContext, useRef, useEffect } from "react";
import "./toolbar.css";
import OpenFile from "./fileDropDown/openFile";
import DownloadFile from "./fileDropDown/download";
import pdfLogo from "../../assets/pdf_logo.png";
import MergePDF from "./tools/mergePDF";
import OCR from './tools/ocr';
import { DocSpecsContext } from "@/App";
import { SaveFile, SaveFileAs } from './fileDropDown/saveFiles';
import { HTMLPDF, MarkdownPDF, WordPDF } from "./tools/conversionFunctions";
import PageNumbering from "./tools/pageNumbering";

export default function Toolbar() {
  const {
    uploadedFile,
    setUploadedFile,
    setFileName,
    setFileType,
  } = useContext(DocSpecsContext);

  const [active, setActive] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActive(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function getDropdown(tab) {
    switch (tab) {
      case "files":
        return (
          <div className="dropdown-menu">
            <button onClick={() => OpenFile({ setUploadedFile, setFileName, setFileType })}>
              Open
            </button>
            {uploadedFile && (
              <button onClick={() => DownloadFile({ uploadedFile })}>
                Download
              </button>
            )}
            {uploadedFile && (
              <button onClick={() => SaveFileAs({ uploadedFile })}>
                Save as
              </button>
            )}
            {uploadedFile && (
              <button onClick={() => SaveFile({ uploadedFile })}>
                Save
              </button>
            )}
          </div>
        );

      case "signature":
        return (
          <div className="dropdown-menu">
            <button>Open</button>
            <button>MitId</button>
            <button>Draw</button>
          </div>
        );

      case "tools":
        return (
          <div className="dropdown-menu">
            <MergePDF
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
            <WordPDF
              setUploadedFile={setUploadedFile}
              setFileName={setFileName}
              setFileType={setFileType}
            />
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

      <div className="toolbar_item">
        <button
          className={`toolbar_button ${active === "signature" ? "active" : ""}`}
          onClick={() => setActive(active === "signature" ? null : "signature")}
        >
          Signature
        </button>
        {active === "signature" && getDropdown("signature")}
      </div>

      <div className="toolbar_item">
        <button
          className={`toolbar_button ${active === "tools" ? "active" : ""}`}
          onClick={() => setActive(active === "tools" ? null : "tools")}
        >
          Tools
        </button>
        {active === "tools" && getDropdown("tools")}
      </div>
    </div>
  );
}