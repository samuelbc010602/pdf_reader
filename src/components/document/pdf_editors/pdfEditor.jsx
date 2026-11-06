
import { useEffect, useRef, useState } from "react";
import { BLANK_PDF } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import { generate } from "@pdfme/generator";
import { DocSpecsContext } from "@/App";
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
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("Untitled");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;

    const designer = new Designer({
      domContainer: containerRef.current,
      template: createBlankTemplate(),
      plugins,
      options: {
        zoomLevel: 1,
        sidebarOpen: true,
        lang: "en",
      },
    });

    designerRef.current = designer;

    return () => {
      designer.destroy();
      designerRef.current = null;
    };
  }, []);

  // Download a file in the browser.
  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Save the editable design as a JSON template.
  const saveTemplate = () => {
    try {
      const template = designerRef.current?.getTemplate();

      if (!template) return;

      downloadBlob(
        new Blob([JSON.stringify(template, null, 2)], {
          type: "application/json",
        }),
        `${fileName || "document"}.json`
      );

      setMessage("Template saved.");
    } catch (error) {
      console.error(error);
      setMessage("Could not save the template.");
    }
  };

  // Export the current design as an actual PDF file.
  const exportPdf = async () => {
    if (!designerRef.current || busy) return;

    setBusy(true);
    setMessage("");

    try {
      const template = designerRef.current.getTemplate();

      // Use each element's current content as its initial value.
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
    } catch (error) {
      console.error(error);
      setMessage("PDF export failed. Check the console for details.");
    } finally {
      setBusy(false);
    }
  };

  // Open a previously saved pdfme JSON template.
  const openTemplate = () => {
    fileInputRef.current?.click();
  };

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
        throw new Error("Invalid pdfme template.");
      }

      // Replace the existing design without remounting the component.
      designerRef.current.updateTemplate(template);

      setFileName(file.name.replace(/\.json$/i, ""));
      setMessage("Template opened.");
    } catch (error) {
      console.error(error);
      setMessage("Could not open this template.");
    }
  };

  const changeZoom = (amount) => {
    const nextZoom = Math.min(
      2,
      Math.max(0.5, Math.round((zoom + amount) * 100) / 100)
    );

    setZoom(nextZoom);
    designerRef.current?.updateOptions({
      zoomLevel: nextZoom,
    });
  };

  const startNewDocument = () => {
    if (
      !window.confirm(
        "Start a new document? Export or save your current template first."
      )
    ) {
      return;
    }

    designerRef.current?.updateTemplate(createBlankTemplate());
    setFileName("Untitled");
    setMessage("");
    setZoom(1);
    designerRef.current?.updateOptions({ zoomLevel: 1 });
  };

  return (
    <div className="pdf-editor" style={style}>
      <header className="pdf-editor__toolbar">
        <div className="pdf-editor__file">
          <input
            value={fileName}
            aria-label="Document name"
            onChange={(event) => setFileName(event.target.value)}
            title="Document name"
          />
        </div>

        <div className="pdf-editor__actions">
          <button onClick={startNewDocument}>
            New
          </button>

          <button onClick={openTemplate}>
            Open template
          </button>

          <button onClick={saveTemplate}>
            Save template
          </button>

          <button
            onClick={() => changeZoom(-0.25)}
            disabled={zoom <= 0.5}
            title="Zoom out"
          >
            −
          </button>

          <span className="pdf-editor__zoom">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => changeZoom(0.25)}
            disabled={zoom >= 2}
            title="Zoom in"
          >
            +
          </button>

          <button
            className="pdf-editor__export"
            onClick={exportPdf}
            disabled={busy}
          >
            {busy ? "Exporting..." : "Export PDF"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleTemplateFile}
        />
      </header>

      {message && (
        <div className="pdf-editor__message" role="status">
          {message}
        </div>
      )}

      <div
        ref={containerRef}
        className="pdf-editor__designer"
      />
    </div>
  );
}
