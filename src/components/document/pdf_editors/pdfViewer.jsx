
import { PDFViewer } from "@embedpdf/react-pdf-viewer";
import { DocSpecsContext } from "@/App";
import { useRef, useEffect, useEffectEvent, useState, useContext, useCallback } from "react";

export default function PdfViewer({
  config,
  style
}) {
  const viewerRef = useRef(null);
  const { toClose,
          toPrint,
          toExport,
          toFullscreen,
          toSecure,
          toCapture,
          registerCurrentFileGetter } = useContext(DocSpecsContext);
  
  const getModifiedPDF = useCallback(async () => {

    const registry = await viewerRef.current?.registry;

    if (!registry) {
        throw new Error("PDF viewer not initialized");
    }

    const exportPlugin = registry
        .getPlugin("export")
        ?.provides();

    if (!exportPlugin) {
        throw new Error("Export plugin not available");
    }

    const pdfBytes = await exportPlugin
        .saveAsCopy()
        .toPromise();

    return new File(
        [pdfBytes],
        config.fileName || "document.pdf",
        { type: "application/pdf" }
    );

  }, [config.fileName]);

  useEffect(() => {
      return registerCurrentFileGetter(getModifiedPDF);
  }, [registerCurrentFileGetter, getModifiedPDF]);


  const previousValues = useRef({ toClose,toPrint,toExport,toFullscreen,toSecure,toCapture });

  useEffect(() => {
    const currentValues = { toClose, toPrint, toExport, toFullscreen, toSecure, toCapture };
  
    const commandsMap = {
      toClose: "document:close",
      toPrint: "document:print",
      toExport: "document:export",
      toFullscreen: "document:fullscreen",
      toSecure: "document:protect",
      toCapture: "document:capture"
    };
  
    const changedCommands = Object.keys(commandsMap).filter(
      (key) => currentValues[key] !== previousValues.current[key]
    );
  
    previousValues.current = currentValues;
  
    if (changedCommands.length === 0) return;
  
    const executeCommands = async () => {
      const registry = await viewerRef.current?.registry;
      if (!registry) return;
  
      const commands = registry.getPlugin("commands").provides();
      const allCommands = commands.getAllCommands();
      console.log("these are all the commands",allCommands);
  
      changedCommands.forEach((key) => {
        const command = allCommands.find(
          (item) => item.id === commandsMap[key]
        );
  
        command?.execute();
      });
    };
  
    executeCommands();
  }, [
    toClose,
    toPrint,
    toExport,
    toFullscreen,
    toSecure,
    toCapture,
  ]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <PDFViewer
        ref={viewerRef}
        config={{
          src: config.src,
          disabledCategories: [
            "document-open",
            "document-export",
            "document-close",
            "document-capture",
            "document-fullscreen",
            "document-print"
          ],
        }}
        style={style}
      />
    </div>
  );
}
