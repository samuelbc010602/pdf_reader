import React, { useContext, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { DocSpecsContext } from "@/App";
import { Hash } from "lucide-react";
import './tool_styles.css'
export default function PageNumbering() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [processedFile, setProcessedFile] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const {setUploadedFile,
    setFileName,
    setFileType,
    uploadedFile} = useContext(DocSpecsContext);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setProcessedFile(null);
    setShowOverwriteConfirm(false);

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  // Add page numbering to every page using pdf-lib
  async function handleAddPageNumbers() {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError("");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        const text = `Page ${i + 1} of ${totalPages}`;
        const fontSize = 10;
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        // Center the page number horizontally at the bottom
        const x = (width - textWidth) / 2;
        const y = 20;

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const newName = selectedFile.name.replace(
        /\.pdf$/i,
        "_numbered.pdf"
      );

      const newFile = new File([pdfBytes], newName, {
        type: "application/pdf",
      });

      setProcessedFile(newFile);
    } catch (err) {
      setError(err.message || "Failed to add page numbers.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDownload() {
    if (!processedFile) return;

    const url = URL.createObjectURL(processedFile);
    const link = document.createElement("a");

    link.href = url;
    link.download = processedFile.name;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openProcessedFile() {
    if (!processedFile) return;

    setUploadedFile(processedFile);
    setFileName(processedFile.name);
    setFileType("pdf");

    setShowOverwriteConfirm(false);
    setIsOpen(false);
  }

  function handleOpenInEditor() {
    if (!processedFile) return;

    if (!uploadedFile) {
      // No existing file: open immediately
      openProcessedFile();
    } else {
      // An existing file is open: ask before replacing it
      setShowOverwriteConfirm(true);
    }
  }

  function handleOverwrite() {
    // Replace the existing file with the processed PDF
    openProcessedFile();
  }

  function handleCancelOverwrite() {
    // Keep the existing file unchanged
    setShowOverwriteConfirm(false);
  }

  function handleClose() {
    setIsOpen(false);
    setShowOverwriteConfirm(false);
  }

  return (
    <>
      <button
        type="button"
        className="dropdown-item"
        onClick={() => setIsOpen(true)}
      >
        <Hash size={17} strokeWidth={1.8} />
        <span>Add page numbers</span>
      </button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>Add Page Numbers</h2>
              <button onClick={handleClose}>Close</button>
            </div>

            <p>
              Upload a PDF file to automatically stamp page numbers
              onto every page.
            </p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select PDF File"}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                hidden
              />
            </label>

            {selectedFile && !processedFile && (
              <div style={{ marginTop: "12px" }}>
                <button
                  disabled={isProcessing}
                  onClick={handleAddPageNumbers}
                >
                  {isProcessing
                    ? "Adding Page Numbers..."
                    : "Process PDF"}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            {showOverwriteConfirm ? (
              <div style={styles.confirmBox}>
                <p>
                  You have already opened another file in the editor.
                  Do you want to overwrite it with the numbered PDF?
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "10px",
                  }}
                >
                  <button onClick={handleOverwrite}>
                    Overwrite
                  </button>

                  <button onClick={handleCancelOverwrite}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.footer}>
                <button
                  disabled={!processedFile}
                  onClick={handleDownload}
                >
                  Download PDF
                </button>

                <button
                  disabled={!processedFile}
                  onClick={handleOpenInEditor}
                >
                  Open in editor
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    background: "white",
    color: "#222",
    borderRadius: 12,
    padding: 24,
    width: "min(720px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  addButton: {
    display: "inline-block",
    cursor: "pointer",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: 6,
    marginTop: 12,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 24,
  },
  confirmBox: {
    marginTop: 20,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#f9f9f9",
  },
  error: {
    color: "#b00020",
    marginTop: 12,
  },
};