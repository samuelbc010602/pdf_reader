import React, { useState } from "react";


function createValidPdfFile(filename) {
  const minimalPdfBytes = 
    "%PDF-1.7\n" +
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n" +
    "4 0 obj<</Length 20>>stream\nBT /F1 12 Tf 72 700 Td (Converted Document) Tj ET\nendstream\nendobj\n" +
    "xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \n" +
    "trailer<</Size 5/Root 1 0 R>>\nstartxref\n290\n%%EOF";

  const blob = new Blob([minimalPdfBytes], { type: "application/pdf" });
  return new File([blob], filename, { type: "application/pdf" });
}

// ==========================================
// 1. PDFHTML: Upload PDF -> Convert -> Download
// ==========================================
export function PDFHTML({
  setUploadedFile,
  setFileName,
  setFileType,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertedUrl, setConvertedUrl] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setConvertedUrl(null);

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const htmlContent = `<html><body><h1>Converted from ${selectedFile.name}</h1></body></html>`;
      const blob = new Blob([htmlContent], { type: "text/html" });
      setConvertedUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message || "Failed to convert PDF to HTML.");
    } finally {
      setIsConverting(false);
    }
  }

  function handleDownload() {
    if (!convertedUrl || !selectedFile) return;

    const link = document.createElement("a");
    link.href = convertedUrl;
    link.download = selectedFile.name.replace(/\.pdf$/i, ".html");
    link.click();

    setTimeout(() => URL.revokeObjectURL(convertedUrl), 1000);
    setIsOpen(false);
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>PDF to HTML</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>PDF to HTML Converter</h2>
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <p>Upload a PDF file, convert it, and download the resulting HTML format.</p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select PDF File"}
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} hidden />
            </label>

            {selectedFile && !convertedUrl && (
              <div style={{ marginTop: "12px" }}>
                <button disabled={isConverting} onClick={handleConvert}>
                  {isConverting ? "Converting..." : "Convert File"}
                </button>
              </div>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            <div style={styles.footer}>
              <button disabled={!convertedUrl} onClick={handleDownload}>
                Download HTML
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ==========================================
// 2. HTMLPDF: Upload HTML -> Convert -> Download / Open in Editor
// ==========================================
export function HTMLPDF({
  setUploadedFile,
  setFileName,
  setFileType,
  uploadedFile,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertedFile, setConvertedFile] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setConvertedFile(null);
    setShowOverwriteConfirm(false);

    if (!file) return;

    if (!file.name.toLowerCase().match(/\.(html|htm)$/)) {
      setError("Please select a valid HTML file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const pdfName = selectedFile.name.replace(/\.(html|htm)$/i, ".pdf");
      const newFile = createValidPdfFile(pdfName);
      setConvertedFile(newFile);
    } catch (err) {
      setError(err.message || "Failed to convert HTML to PDF.");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownload() {
    if (!convertedFile) return;

    const url = URL.createObjectURL(convertedFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = convertedFile.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleOpenInEditor() {
    if (!convertedFile) return;

    const setNewFile = () => {
      setUploadedFile(convertedFile);
      setFileName(convertedFile.name);
      setFileType("pdf");
      setIsOpen(false);
      setShowOverwriteConfirm(false);
    };

    if (!uploadedFile) {
      setNewFile();
    } else {
      setShowOverwriteConfirm(true);
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>HTML to PDF</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>HTML to PDF Converter</h2>
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <p>Upload an HTML file, convert it, then download or open it as a PDF.</p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select HTML File"}
              <input type="file" accept=".html,.htm" onChange={handleFileChange} hidden />
            </label>

            {selectedFile && !convertedFile && (
              <div style={{ marginTop: "12px" }}>
                <button disabled={isConverting} onClick={handleConvert}>
                  {isConverting ? "Converting..." : "Convert File"}
                </button>
              </div>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            {showOverwriteConfirm ? (
              <div style={styles.confirmBox}>
                <p>You have already opened another file in the editor, do you want to overwrite?</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button onClick={() => {
                    setUploadedFile(convertedFile);
                    setFileName(convertedFile.name);
                    setFileType("pdf");
                    setIsOpen(false);
                    setShowOverwriteConfirm(false);
                  }}>
                    Overwrite
                  </button>
                  <button onClick={() => setShowOverwriteConfirm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={styles.footer}>
                <button disabled={!convertedFile} onClick={handleDownload}>
                  Download PDF
                </button>
                <button disabled={!convertedFile} onClick={handleOpenInEditor}>
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


// ==========================================
// 3. PDFMarkdown: Upload PDF -> Convert -> Download
// ==========================================
export function PDFMarkdown({
  setUploadedFile,
  setFileName,
  setFileType,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertedUrl, setConvertedUrl] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setConvertedUrl(null);

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mdContent = `# Converted from ${selectedFile.name}\n\nSample extracted content text...`;
      const blob = new Blob([mdContent], { type: "text/markdown" });
      setConvertedUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message || "Failed to convert PDF to Markdown.");
    } finally {
      setIsConverting(false);
    }
  }

  function handleDownload() {
    if (!convertedUrl || !selectedFile) return;

    const link = document.createElement("a");
    link.href = convertedUrl;
    link.download = selectedFile.name.replace(/\.pdf$/i, ".md");
    link.click();

    setTimeout(() => URL.revokeObjectURL(convertedUrl), 1000);
    setIsOpen(false);
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>PDF to Markdown</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>PDF to Markdown Converter</h2>
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <p>Upload a PDF file, convert it, and download its content as Markdown.</p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select PDF File"}
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} hidden />
            </label>

            {selectedFile && !convertedUrl && (
              <div style={{ marginTop: "12px" }}>
                <button disabled={isConverting} onClick={handleConvert}>
                  {isConverting ? "Converting..." : "Convert File"}
                </button>
              </div>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            <div style={styles.footer}>
              <button disabled={!convertedUrl} onClick={handleDownload}>
                Download Markdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ==========================================
// 4. MarkdownPDF: Upload Markdown -> Convert -> Download / Open in Editor
// ==========================================
export function MarkdownPDF({
  setUploadedFile,
  setFileName,
  setFileType,
  uploadedFile,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertedFile, setConvertedFile] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setConvertedFile(null);
    setShowOverwriteConfirm(false);

    if (!file) return;

    if (!file.name.toLowerCase().match(/\.(md|markdown)$/)) {
      setError("Please select a valid Markdown file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const pdfName = selectedFile.name.replace(/\.(md|markdown)$/i, ".pdf");
      const newFile = createValidPdfFile(pdfName);
      setConvertedFile(newFile);
    } catch (err) {
      setError(err.message || "Failed to convert Markdown to PDF.");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownload() {
    if (!convertedFile) return;

    const url = URL.createObjectURL(convertedFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = convertedFile.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleOpenInEditor() {
    if (!convertedFile) return;

    const setNewFile = () => {
      setUploadedFile(convertedFile);
      setFileName(convertedFile.name);
      setFileType("pdf");
      setIsOpen(false);
      setShowOverwriteConfirm(false);
    };

    if (!uploadedFile) {
      setNewFile();
    } else {
      setShowOverwriteConfirm(true);
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Markdown to PDF</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>Markdown to PDF Converter</h2>
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <p>Upload a Markdown file, convert it, then download or open it as a PDF.</p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select Markdown File"}
              <input type="file" accept=".md,.markdown" onChange={handleFileChange} hidden />
            </label>

            {selectedFile && !convertedFile && (
              <div style={{ marginTop: "12px" }}>
                <button disabled={isConverting} onClick={handleConvert}>
                  {isConverting ? "Converting..." : "Convert File"}
                </button>
              </div>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            {showOverwriteConfirm ? (
              <div style={styles.confirmBox}>
                <p>You have already opened another file in the editor, do you want to overwrite?</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button onClick={() => {
                    setUploadedFile(convertedFile);
                    setFileName(convertedFile.name);
                    setFileType("pdf");
                    setIsOpen(false);
                    setShowOverwriteConfirm(false);
                  }}>
                    Overwrite
                  </button>
                  <button onClick={() => setShowOverwriteConfirm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={styles.footer}>
                <button disabled={!convertedFile} onClick={handleDownload}>
                  Download PDF
                </button>
                <button disabled={!convertedFile} onClick={handleOpenInEditor}>
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


// ==========================================
// 5. WordPDF: Upload Word -> Convert -> Download / Open in Editor
// ==========================================
import mammoth from "mammoth";
import {PDFDocument, rgb, StandardFonts } from "pdf-lib";

export function WordPDF({
  setUploadedFile,
  setFileName,
  setFileType,
  uploadedFile,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertedFile, setConvertedFile] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setConvertedFile(null);
    setShowOverwriteConfirm(false);

    if (!file) return;

    if (!file.name.toLowerCase().match(/\.(docx|doc)$/)) {
      setError("Please select a valid Word file (.docx or .doc).");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  // Real conversion function using mammoth + pdf-lib
  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError("");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // 1. Extract raw text from the Word document using mammoth
      const result = await mammoth.extractRawText({ arrayBuffer });
      const textContent = result.value || "[Empty Word Document]";

      // 2. Create a brand new PDF document using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const fontSize = 11;
      const lineHeight = 14;
      const margin = 50;
      const pageWidth = 612;
      const pageHeight = 792;
      const maxLineWidth = pageWidth - margin * 2;

      // Word wrapping helper logic
      const paragraphs = textContent.split("\n");
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      for (const paragraph of paragraphs) {
        // Break long lines so they fit inside page bounds
        const words = paragraph.split(" ");
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (textWidth > maxLineWidth) {
            if (y < margin + lineHeight) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight * 1.5; // Extra spacing for paragraph break
        }
      }

      // 3. Save PDF bytes and wrap into a File object
      const pdfBytes = await pdfDoc.save();
      const pdfName = selectedFile.name.replace(/\.(docx|doc)$/i, ".pdf");
      const newFile = new File([pdfBytes], pdfName, { type: "application/pdf" });

      setConvertedFile(newFile);
    } catch (err) {
      setError(err.message || "Failed to convert Word document to PDF.");
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDownload() {
    if (!convertedFile) return;

    const url = URL.createObjectURL(convertedFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = convertedFile.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleOpenInEditor() {
    if (!convertedFile) return;

    const setNewFile = () => {
      setUploadedFile(convertedFile);
      setFileName(convertedFile.name);
      setFileType("pdf");
      setIsOpen(false);
      setShowOverwriteConfirm(false);
    };

    if (!uploadedFile) {
      setNewFile();
    } else {
      setShowOverwriteConfirm(true);
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Word to PDF</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>Word to PDF Converter</h2>
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <p>Upload a Word document, convert it to read its actual content, then download or open it as a PDF.</p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select Word File"}
              <input type="file" accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} hidden />
            </label>

            {selectedFile && !convertedFile && (
              <div style={{ marginTop: "12px" }}>
                <button disabled={isConverting} onClick={handleConvert}>
                  {isConverting ? "Converting..." : "Convert File"}
                </button>
              </div>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            {showOverwriteConfirm ? (
              <div style={styles.confirmBox}>
                <p>You have already opened another file in the editor, do you want to overwrite?</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button onClick={() => {
                    setUploadedFile(convertedFile);
                    setFileName(convertedFile.name);
                    setFileType("pdf");
                    setIsOpen(false);
                    setShowOverwriteConfirm(false);
                  }}>
                    Overwrite
                  </button>
                  <button onClick={() => setShowOverwriteConfirm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={styles.footer}>
                <button disabled={!convertedFile} onClick={handleDownload}>
                  Download PDF
                </button>
                <button disabled={!convertedFile} onClick={handleOpenInEditor}>
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


// ==========================================
// 6. PDFWord: Upload PDF -> Convert -> Download Word (.docx)
// ==========================================
export function PDFWord({
  setUploadedFile,
  setFileName,
  setFileType,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [convertedUrl, setConvertedUrl] = useState(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setConvertedUrl(null);

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    event.target.value = "";
  }

  async function handleConvert() {
    if (!selectedFile) return;

    setIsConverting(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockWordBlob = new Blob(["Mock Word Document Binary Content"], { 
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      });
      setConvertedUrl(URL.createObjectURL(mockWordBlob));
    } catch (err) {
      setError(err.message || "Failed to convert PDF to Word.");
    } finally {
      setIsConverting(false);
    }
  }

  function handleDownload() {
    if (!convertedUrl || !selectedFile) return;

    const link = document.createElement("a");
    link.href = convertedUrl;
    link.download = selectedFile.name.replace(/\.pdf$/i, ".docx");
    link.click();

    setTimeout(() => URL.revokeObjectURL(convertedUrl), 1000);
    setIsOpen(false);
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>PDF to Word</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div role="dialog" aria-modal="true" style={styles.modal}>
            <div style={styles.header}>
              <h2>PDF to Word Converter</h2>
              <button onClick={() => setIsOpen(false)}>Close</button>
            </div>

            <p>Upload a PDF file, convert it, and download it as an editable Word document (.docx).</p>

            <label style={styles.addButton}>
              {selectedFile ? selectedFile.name : "+ Select PDF File"}
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} hidden />
            </label>

            {selectedFile && !convertedUrl && (
              <div style={{ marginTop: "12px" }}>
                <button disabled={isConverting} onClick={handleConvert}>
                  {isConverting ? "Converting..." : "Convert File"}
                </button>
              </div>
            )}

            {error && <p role="alert" style={styles.error}>{error}</p>}

            <div style={styles.footer}>
              <button disabled={!convertedUrl} onClick={handleDownload}>
                Download Word Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ==========================================
// Shared Styles matching MergePDF.jsx
// ==========================================
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