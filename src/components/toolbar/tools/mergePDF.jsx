import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function MergePDF({
  setUploadedFile,
  setFileName,
  setFileType,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState("");

  // Add PDFs and read their page counts.
  async function addPDFs(event) {
    const files = Array.from(event.target.files || []);
    setError("");

    const newPDFs = [];

    for (const file of files) {
      if (file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      try {
        const doc = await PDFDocument.load(await file.arrayBuffer());

        newPDFs.push({
          id: crypto.randomUUID(),
          file,
          pageCount: doc.getPageCount(),
          pages: "", // Empty means include every page.
        });
      } catch {
        setError(`Could not read ${file.name}. It may be encrypted or invalid.`);
      }
    }

    setPdfs((current) => [...current, ...newPDFs]);
    event.target.value = "";
  }

  function updatePages(id, pages) {
    setPdfs((current) =>
      current.map((pdf) =>
        pdf.id === id ? { ...pdf, pages } : pdf
      )
    );
  }

  function removePDF(id) {
    setPdfs((current) => current.filter((pdf) => pdf.id !== id));
  }

  function movePDF(index, direction) {
    setPdfs((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Convert inputs such as "1-3, 5, 8-10" to zero-based page indices.
  function parsePages(input, pageCount) {
    if (!input.trim()) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }

    const result = [];

    for (const part of input.split(",")) {
      const range = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);

      if (!range) {
        throw new Error(`Invalid page range: "${part.trim()}"`);
      }

      const start = Number(range[1]);
      const end = Number(range[2] ?? range[1]);

      if (
        start < 1 ||
        end < start ||
        end > pageCount
      ) {
        throw new Error(
          `Page range "${part.trim()}" is invalid. ` +
          `This PDF has ${pageCount} pages.`
        );
      }

      for (let page = start; page <= end; page++) {
        result.push(page - 1);
      }
    }

    return result;
  }

  async function createMergedPDF() {
    if (pdfs.length === 0) {
      setError("Add at least one PDF first.");
      return null;
    }

    setIsMerging(true);
    setError("");

    try {
      const mergedPDF = await PDFDocument.create();

      for (const item of pdfs) {
        const source = await PDFDocument.load(
          await item.file.arrayBuffer()
        );

        const selectedPages = parsePages(
          item.pages,
          source.getPageCount()
        );

        const copiedPages = await mergedPDF.copyPages(
          source,
          selectedPages
        );

        copiedPages.forEach((page) => mergedPDF.addPage(page));
      }

      const bytes = await mergedPDF.save();

      return new File(
        [bytes],
        "merged.pdf",
        { type: "application/pdf" }
      );
    } catch (err) {
      setError(err.message || "Failed to merge the PDFs.");
      return null;
    } finally {
      setIsMerging(false);
    }
  }

  async function downloadMergedPDF() {
    const file = await createMergedPDF();
    if (!file) return;

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openMergedPDF() {
    const file = await createMergedPDF();
    if (!file) return;

    // Send the merged File to the existing editor.

    function setNewFile(){
        setUploadedFile(file);
        setFileName(file.name);
        setFileType("pdf");
        setIsOpen(false);
    }
    if (file == null){
        setNewFile();
    }else{
        return (
            <div style={{ padding: "20px" }}>
                {window.alert("You have already opened another file in the editor, do you want to overwrite")}
                <button onClick = {() => setNewFile()}>Overwrite</button>
                <button>Cancel</button>
            </div>
          );
    }

    
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Merge/Split PDFs
      </button>

      {isOpen && (
        <div style={styles.overlay}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-title"
            style={styles.modal}
          >
            <div style={styles.header}>
              <h2 id="merge-title">Merge PDFs</h2>
              <button onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>

            <p>
              Add PDFs in the order you want them merged.
              Enter page ranges to include only specific pages.
            </p>

            <label style={styles.addButton}>
              + Add PDFs
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                onChange={addPDFs}
                hidden
              />
            </label>

            <div style={styles.list}>
              {pdfs.map((pdf, index) => (
                <div key={pdf.id} style={styles.pdfRow}>
                  <div style={styles.pdfInfo}>
                    <strong>{index + 1}. {pdf.file.name}</strong>
                    <span>{pdf.pageCount} pages</span>

                    <label>
                      Pages to include
                      <input
                        style={styles.pageInput}
                        value={pdf.pages}
                        onChange={(event) =>
                          updatePages(pdf.id, event.target.value)
                        }
                        placeholder={`All pages (1-${pdf.pageCount})`}
                      />
                    </label>
                  </div>

                  <div style={styles.controls}>
                    <button
                      disabled={index === 0}
                      onClick={() => movePDF(index, -1)}
                      aria-label="Move PDF up"
                    >
                      ↑
                    </button>
                    <button
                      disabled={index === pdfs.length - 1}
                      onClick={() => movePDF(index, 1)}
                      aria-label="Move PDF down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removePDF(pdf.id)}
                      aria-label="Remove PDF"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <div style={styles.footer}>
              <button
                disabled={isMerging || pdfs.length === 0}
                onClick={downloadMergedPDF}
              >
                {isMerging ? "Merging..." : "Download merged PDF"}
              </button>

              <button
                disabled={isMerging || pdfs.length === 0}
                onClick={openMergedPDF}
              >
                {isMerging ? "Merging..." : "Open in editor"}
              </button>
            </div>

            <p style={styles.hint}>
              Page numbers start at 1. Examples: 1-3, 5, 8-10.
              Leave the field empty to include all pages.
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
  },
  list: {
    display: "grid",
    gap: 12,
    marginTop: 20,
  },
  pdfRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
  },
  pdfInfo: {
    display: "grid",
    gap: 8,
    minWidth: 0,
    overflowWrap: "anywhere",
    flex: 1,
  },
  pageInput: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 8,
    marginTop: 4,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  footer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 24,
  },
  error: {
    color: "#b00020",
  },
  hint: {
    fontSize: 13,
    color: "#666",
    marginTop: 16,
  },
};
