import { useContext } from "react";
import { PDFEditor } from "@/components/extend/pdf-editor";
import { DocxEditorPreview } from "@/components/extend/docx-editor.jsx";
import { DocSpecsContext } from "@/App";

import "./document.css";

export default function CustomDocument() {
  const {
    uploadedFile,
    setUploadedFile,
    fileName,
    setFileName,
    fileType,
    setFileType,
  } = useContext(DocSpecsContext);

  // Function to determine which viewer to use based on fileType
  function getViewer(fileType) {
    switch (fileType) {
      case "pdf":
        return (
          <PDFEditor/>
        );
      case "docx":
        return (
          <DocxEditorPreview></DocxEditorPreview>
        );
      default:
        return null;
    }
  }

  return <div className="document-app">{getViewer(fileType)}</div>;
}