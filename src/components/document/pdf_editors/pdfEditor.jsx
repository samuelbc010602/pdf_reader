import { useEffect, useRef, useState, useCallback } from "react";
import { BLANK_PDF } from "@pdfme/common";
import { FaInfoCircle } from "react-icons/fa";
import { Designer } from "@pdfme/ui";
import { generate } from "@pdfme/generator";
import {
  text,
  image,
  signature,
  barcodes,
} from "@pdfme/schemas";

import "./PdfEditor.css";

const plugins = {
  text,
  image,
  signature,
  qrcode: barcodes.qrcode,
};

const createBlankTemplate = () => ({
  basePdf: BLANK_PDF,
  schemas: [[]],
});

export default function PdfEditor({ config, style }) {
  const containerRef = useRef(null);
  const designerRef = useRef(null);
  const templateInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const [fileName, setFileName] = useState("Untitled");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // --------------------------------------------------
  // Designer initialization
  // --------------------------------------------------

  useEffect(() => {
    if (!containerRef.current) return;

    const designer = new Designer({
      domContainer: containerRef.current,
      template: createBlankTemplate(),
      plugins,
      options: {
        zoomLevel: 1,
        maxZoom: 400,
        sidebarOpen: true,
        leftSidebarWidth: 65,
        rightSidebarWidth: 400,
        lang: "en",
        theme: {
          token: {
            colorPrimary: "#10b981",
            borderRadius: 8,
          },
        },
      },
    });

    designerRef.current = designer;

    return () => {
      designer.destroy();
      designerRef.current = null;
    };
  }, []);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const downloadBlob = useCallback((blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = name;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const getTemplate = () => {
    return designerRef.current?.getTemplate();
  };

  // --------------------------------------------------
  // New document
  // --------------------------------------------------

  const startNewDocument = useCallback(() => {
    if (
      !window.confirm(
        "Start a new document? Unsaved changes will be lost."
      )
    ) {
      return;
    }

    designerRef.current?.updateTemplate(createBlankTemplate());

    setFileName("Untitled");
    setMessage("");
  }, []);

  // --------------------------------------------------
  // Open PDF
  // --------------------------------------------------

  const openPdf = useCallback(() => {
    pdfInputRef.current?.click();
  }, []);

  const handlePdfFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !designerRef.current) return;

    try {
      if (file.type !== "application/pdf") {
        throw new Error("Please select a PDF file.");
      }

      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      const template = {
        basePdf: pdfBytes,
        schemas: [[]],
      };

      designerRef.current.updateTemplate(template);

      setFileName(file.name.replace(/\.pdf$/i, ""));
      setMessage("PDF opened successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Could not open PDF.");
    }
  };

  // --------------------------------------------------
  // Save editable template
  // --------------------------------------------------

  const saveTemplate = useCallback(() => {
    try {
      const template = getTemplate();

      if (!template) return;

      downloadBlob(
        new Blob([JSON.stringify(template, null, 2)], {
          type: "application/json",
        }),
        `${fileName || "document"}.json`
      );

      setMessage("Template saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not save template.");
    }
  }, [fileName, downloadBlob]);

  // --------------------------------------------------
  // Open editable template
  // --------------------------------------------------

  const openTemplate = useCallback(() => {
    templateInputRef.current?.click();
  }, []);

  const handleTemplateFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !designerRef.current) return;

    try {
      const template = JSON.parse(await file.text());

      if (
        !template ||
        !Array.isArray(template.schemas) ||
        !template.basePdf
      ) {
        throw new Error("Invalid template.");
      }

      designerRef.current.updateTemplate(template);

      setFileName(file.name.replace(/\.json$/i, ""));
      setMessage("Template opened successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not open this template.");
    }
  };

  // --------------------------------------------------
  // Export PDF
  // --------------------------------------------------

  const exportPdf = useCallback(async () => {
    if (!designerRef.current || busy) return;

    setBusy(true);

    try {
      const template = getTemplate();

      const inputs = template.schemas.map((page) =>
        Object.fromEntries(
          page.map((schema) => [
            schema.name,
            schema.content ?? "",
          ])
        )
      );

      const pdf = await generate({
        template,
        inputs,
        plugins,
      });

      downloadBlob(
        new Blob([pdf.buffer], {
          type: "application/pdf",
        }),
        `${fileName || "document"}.pdf`
      );

      setMessage("PDF exported successfully.");
    } catch (error) {
      console.error(error);
      setMessage("PDF export failed.");
    } finally {
      setBusy(false);
    }
  }, [busy, fileName, downloadBlob]);

  // --------------------------------------------------
  // Toolbar event listeners
  // --------------------------------------------------

  useEffect(() => {
    const events = {
      "pdf-editor:new": startNewDocument,
      "pdf-editor:open-pdf": openPdf,
      "pdf-editor:open-template": openTemplate,
      "pdf-editor:save-template": saveTemplate,
      "pdf-editor:export": exportPdf,
    };

    Object.entries(events).forEach(([name, handler]) => {
      window.addEventListener(name, handler);
    });

    return () => {
      Object.entries(events).forEach(([name, handler]) => {
        window.removeEventListener(name, handler);
      });
    };
  }, [
    startNewDocument,
    openPdf,
    openTemplate,
    saveTemplate,
    exportPdf,
  ]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="pdf-editor" style={style}>
      <input
        ref={templateInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={handleTemplateFile}
      />

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={handlePdfFile}
      />

      {message && (
        <div className="pdf-message-overlay">
          <div className="pdf-message-popup" role="alert">
            <div className="pdf-message-popup__icon">
              <FaInfoCircle />
            </div>

            <p>{message}</p>

            <button
              className="pdf-message-popup__button"
              onClick={() => setMessage("")}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="pdf-editor__loading">
          Generating PDF...
        </div>
      )}

      <div
        ref={containerRef}
        className="pdf-editor__designer"
      />
    </div>
  );
}