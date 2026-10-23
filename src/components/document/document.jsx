import { useState } from "react";
import { PDFEditor } from "@/components/extend/pdf-editor";
import { DocxEditorPreview } from '@/components/extend/docx-editor.jsx'
import "./document.css";

export default function CustomDocument() {
  const [format,setFormat] = useState("docx");

  return (
    <div className="document-app">
      <button onClick = {() => format === "pdf" ? (setFormat("docx")) : (setFormat("pdf"))}>
        Change document format to: {format === "pdf" ? ("docx") : ("pdf")}
      </button>
      {
        format === "pdf" ?
          (
            <PDFEditor></PDFEditor>
          )
          :
          (
            <DocxEditorPreview></DocxEditorPreview>
          )
      }
      
    </div>
  );
}