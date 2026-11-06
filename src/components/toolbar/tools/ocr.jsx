import React, { useContext, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DocSpecsContext } from "@/App";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function OCR() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [processedFile, setProcessedFile] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const {setUploadedFile,
    setFileName,
    setFileType,
    uploadedFile} = useContext(DocSpecsContext);

  function selectFile(event) {
    const selected = event.target.files?.[0];

    if (selected) {
      setFile(selected);
      setProcessedFile(null);
      setShowOverwriteConfirm(false);
      setError("");
    }

    event.target.value = "";
  }

  async function makeSearchablePDF() {
    if (!file) return null;

    setIsProcessing(true);
    setProgress(0);
    setError("");

    let worker;

    try {
      worker = await createWorker("eng");

      const pdfBytes = await file.arrayBuffer();
      const sourcePdf = await pdfjsLib.getDocument({
        data: pdfBytes,
      }).promise;

      const outputPdf = await PDFDocument.create();
      const font = await outputPdf.embedFont(StandardFonts.Helvetica);

      for (let pageIndex = 0; pageIndex < sourcePdf.numPages; pageIndex++) {
        setStatus(
          `Processing page ${pageIndex + 1}/${sourcePdf.numPages}`
        );

        const page = await sourcePdf.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create a canvas context.");
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const imageBlob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(
                  new Error("Could not render the PDF page to an image.")
                );
              }
            },
            "image/png"
          );
        });

        const result = await worker.recognize(
          imageBlob,
          {},
          { blocks: true }
        );

        const data = result?.data ?? {};

        const words = Array.isArray(data.words)
          ? data.words
          : (data.blocks ?? []).flatMap((block) =>
              (block.paragraphs ?? []).flatMap((paragraph) =>
                (paragraph.lines ?? []).flatMap(
                  (line) => line.words ?? []
                )
              )
            );

        const pngBytes = await imageBlob.arrayBuffer();
        const png = await outputPdf.embedPng(pngBytes);

        const outputPage = outputPdf.addPage([
          viewport.width,
          viewport.height,
        ]);

        outputPage.drawImage(png, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });

        for (const word of words) {
          const { x0, y0, x1, y1 } = word.bbox ?? {};
          const text = word.text?.trim();

          if (
            !text ||
            !Number.isFinite(x0) ||
            !Number.isFinite(y0) ||
            !Number.isFinite(x1) ||
            !Number.isFinite(y1) ||
            x1 <= x0 ||
            y1 <= y0
          ) {
            continue;
          }

          const fontSize = Math.max(1, y1 - y0);

          outputPage.drawText(text, {
            x: x0,
            y: viewport.height - y1,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0,
          });
        }

        canvas.width = 0;
        canvas.height = 0;

        setProgress((pageIndex + 1) / sourcePdf.numPages);
      }

      const bytes = await outputPdf.save();

      const outputName =
        `${file.name.replace(/\.pdf$/i, "")}_ocr.pdf`;

      return new File([bytes], outputName, {
        type: "application/pdf",
      });
    } catch (err) {
      console.error("Failed to OCR PDF:", err);
      setError(
        err?.message || "Failed to make the PDF searchable."
      );
      return null;
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn(
            "Could not terminate OCR worker cleanly:",
            terminateError
          );
        }
      }

      setIsProcessing(false);
      setStatus("");
    }
  }

  async function downloadOCR() {
    const output = processedFile || await makeSearchablePDF();

    if (!output) return;

    const url = URL.createObjectURL(output);
    const link = document.createElement("a");

    link.href = url;
    link.download = output.name;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openProcessedFile(output) {
    if (!output) return;

    setUploadedFile(output);
    setFileName(output.name);
    setFileType("pdf");

    setShowOverwriteConfirm(false);
    setIsOpen(false);
  }

  async function openInEditor() {
    const output = processedFile || await makeSearchablePDF();

    if (!output) return;

    setProcessedFile(output);

    if (!uploadedFile) {
      // No existing document: open immediately.
      openProcessedFile(output);
    } else {
      // An existing document is open: ask before replacing it.
      setShowOverwriteConfirm(true);
    }
  }

  function handleOverwrite() {
    openProcessedFile(processedFile);
  }

  function handleCancelOverwrite() {
    setShowOverwriteConfirm(false);
  }

  function handleClose() {
    if (isProcessing) return;

    setIsOpen(false);
    setShowOverwriteConfirm(false);
    setError("");
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>OCR</button>

      {isOpen && (
        <div style={styles.overlay}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ocr-title"
            style={styles.modal}
          >
            <div style={styles.header}>
              <h2 id="ocr-title">Make PDF searchable</h2>

              <button
                disabled={isProcessing}
                onClick={handleClose}
              >
                Close
              </button>
            </div>

            <p>Select a PDF. OCR runs locally in your browser.</p>

            <label style={styles.uploadButton}>
              Select PDF

              <input
                hidden
                type="file"
                accept=".pdf,application/pdf"
                onChange={selectFile}
                disabled={isProcessing}
              />
            </label>

            {file && (
              <div style={styles.fileBox}>
                <strong>{file.name}</strong>
                <div>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            )}

            {isProcessing && (
              <>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${progress * 100}%`,
                    }}
                  />
                </div>

                <p>
                  {status || "Starting OCR…"} (
                  {Math.round(progress * 100)}%)
                </p>
              </>
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
                  Do you want to overwrite it with the searchable PDF?
                </p>

                <div style={styles.confirmActions}>
                  <button
                    onClick={handleOverwrite}
                    disabled={!processedFile}
                  >
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
                  disabled={!file || isProcessing}
                  onClick={downloadOCR}
                >
                  {isProcessing
                    ? "Processing…"
                    : "Download searchable PDF"}
                </button>

                <button
                  disabled={!file || isProcessing}
                  onClick={openInEditor}
                >
                  {isProcessing
                    ? "Processing…"
                    : "Open in editor"}
                </button>
              </div>
            )}

            <p style={styles.hint}>
              Page numbers and text recognition depend on scan quality.
              Large PDFs may take a while to process.
            </p>
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
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    background: "white",
    color: "#222",
    borderRadius: 12,
    padding: 24,
    width: "min(600px, 100%)",
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
  uploadButton: {
    display: "inline-block",
    padding: "10px 14px",
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
  },
  fileBox: {
    marginTop: 20,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    overflowWrap: "anywhere",
  },
  progressBar: {
    marginTop: 20,
    width: "100%",
    height: 10,
    background: "#eee",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#4f46e5",
    transition: "width 150ms linear",
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 24,
  },
  confirmBox: {
    marginTop: 20,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#f9f9f9",
  },
  confirmActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  hint: {
    marginTop: 16,
    color: "#666",
    fontSize: 13,
  },
  error: {
    color: "#b00020",
    overflowWrap: "anywhere",
  },
};