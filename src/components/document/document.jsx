
import { useContext, useEffect, useRef, useState } from "react";
import { DocSpecsContext } from "@/App";
import PdfViewer from "./pdf_editors/pdfViewer";
import PdfEditor from "./pdf_editors/pdfEditor";
import OpenFile from "../toolbar/fileDropDown/openFile";
import "./document.css";
import {
  DEV_MODE,
  DEV_USER,
  DEV_INITIAL_STATE,
} from "@/config/devConfig";

export default function CustomDocument() {
  const {
    uploadedFile,
    setUploadedFile,
    fileType,
    setFileType,
    fileName,
    setFileName,
    newPdf,
    setNewPdf,
  } = useContext(DocSpecsContext);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [showStartscreen,setShowStartScreen] = useState(true);

  // Metadata for the document currently being displayed.
  const [activeFileType, setActiveFileType] = useState(fileType);
  const [activeFileName, setActiveFileName] = useState(fileName);

  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Keep a newly selected file separate until the user confirms.
  const stagedFile = useRef(null);

  // Handle a file selected through the existing Open functionality.
  useEffect(() => {
    if (!uploadedFile || uploadedFile === currentFile) return;

    // If nothing is open, open the file immediately.
    if (!currentFile && !newPdf) {
      setCurrentFile(uploadedFile);
      setActiveFileType(fileType);
      setActiveFileName(fileName);
      setNewPdf(false);
      return;
    }

    // A document or editor session is already active.
    stagedFile.current = {
      file: uploadedFile,
      fileType,
      fileName,
    };

    setPendingAction({ type: "open" });
    setShowOverwriteConfirm(true);
  }, [
    uploadedFile,
    currentFile,
    newPdf,
    fileType,
    fileName,
    setNewPdf,
  ]);

  // Create a URL for the active PDF only.
  useEffect(() => {
    if (!currentFile || activeFileType !== "pdf") {
      setPdfUrl(null);
      return;
    }

    const url = URL.createObjectURL(currentFile);
    setPdfUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [currentFile, activeFileType]);

  // Request to create a new PDF.
  function requestNew() {
    if (currentFile || newPdf) {
      setPendingAction({ type: "new" });
      setShowOverwriteConfirm(true);
      return;
    }
  
    setCurrentFile(null);
    setUploadedFile(null);
    setNewPdf(true);
  }

  useEffect(() => {
    if (uploadedFile || newPdf){
      setShowStartScreen(false);
      return;
    }

  },[uploadedFile,newPdf]);

  // Request to open a file using the existing OpenFile helper.
  function requestOpen() {
    OpenFile({
      setUploadedFile,
      setFileName,
      setFileType,
      setNewPdf,
    });
  }

  // The user confirms the destructive action.
  function handleOverwrite() {
    if (pendingAction?.type === "new") {
      // Discard the active document and switch to a blank editor.
      stagedFile.current = null;
      setCurrentFile(null);
      setUploadedFile(null);
      setNewPdf(true);
    }

    if (pendingAction?.type === "open" && stagedFile.current) {
      // Replace the current document with the staged file.
      const nextFile = stagedFile.current;

      setCurrentFile(nextFile.file);
      setActiveFileType(nextFile.fileType);
      setActiveFileName(nextFile.fileName);

      setNewPdf(false);
      stagedFile.current = null;
    }

    setPendingAction(null);
    setShowOverwriteConfirm(false);
  }

  // The user cancels. Restore the active document's context values.
  function handleCancelOverwrite() {
    const activeFile = currentFile;

    setUploadedFile(activeFile);
    setFileType(activeFileType);
    setFileName(activeFileName);

    stagedFile.current = null;
    setPendingAction(null);
    setShowOverwriteConfirm(false);
  }

  useEffect(() => {
    const loadPdf = async () => {
      if (DEV_MODE) {
        setNewPdf(false);

        try {
          const response = await fetch("/mangler_underskrift.pdf");
  
          if (!response.ok) {
            throw new Error("Could not load development PDF");
          }
  
          const blob = await response.blob();
  
          const file = new File(
            [blob],
            "mangler_underskrift.pdf",
            { type: "application/pdf" }
          );

          
          const url = URL.createObjectURL(file);
          setShowOverwriteConfirm(false);
          setUploadedFile(file);
          setPdfUrl(url);
  
        } catch (error) {
          console.error("Error loading development PDF:", error);
        }
  
        return;
      }
  
      // Your existing production/current-file logic
      if (currentFile) {
        const url = URL.createObjectURL(currentFile);
        setPdfUrl(url);
      }
    };
    
    loadPdf();
  }, [currentFile]);

  const confirmationMessage =
    pendingAction?.type === "new"
      ? "Are you sure you want to create a new PDF? Your current document and any changes will be lost."
      : "Are you sure you want to open another document? Your current document and any changes will be lost.";

  return (
    <>
      <div className="document-app">
        <div className="document-viewer">
        {pdfUrl && !newPdf && (
            <PdfViewer
              key={pdfUrl}
              config={{ src: pdfUrl }}
              style={{ width: "100%", height: "100%" }}
            />
        )}

          {newPdf && <PdfEditor key="new-pdf-editor" />}

          {!pdfUrl && !newPdf && showStartscreen == true && (
            <div className="pdf-empty-state">
              <div className="pdf-empty-icon">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M8 13h8M8 17h5" />
                </svg>
              </div>

              <h4>
                To get started, make a new PDF or open an existing PDF file.
              </h4>

              <div className="pdf-empty-actions">
                <button
                  className="pdf-empty-primary"
                  onClick={requestNew}
                >
                  <span>＋</span> New
                </button>

                <button
                  className="pdf-empty-secondary"
                  onClick={requestOpen}
                >
                  Open
                </button>
              </div>

              <span className="pdf-empty-hint">
                Create a document from scratch or continue working on an
                existing file.
              </span>
            </div>
          )}
        </div>
      </div>

      {showOverwriteConfirm && (
        <div className="overwrite-overlay">
          <div
            className="overwrite-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="overwrite-title"
          >
            <h3 id="overwrite-title">Discard current changes?</h3>

            <p>{confirmationMessage}</p>

            <div className="overwrite-actions">
              <button onClick={handleOverwrite}>
                Continue
              </button>

              <button onClick={handleCancelOverwrite}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
