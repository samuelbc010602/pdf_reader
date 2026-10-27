


export default function DownloadFile({ uploadedFile }) {
    const handleDownload = () => {
      if (!uploadedFile) {
        console.error("No file available to download.");
        return;
      }
  
      // Create a URL for the uploaded file
      const fileURL = URL.createObjectURL(uploadedFile);
  
      // Create an anchor element to trigger the download
      const link = document.createElement("a");
      link.href = fileURL;
      link.download = uploadedFile.name || "downloaded-file.pdf"; // Default name if none is provided
      document.body.appendChild(link);
      link.click();
  
      // Clean up the URL object and remove the anchor element
      URL.revokeObjectURL(fileURL);
      document.body.removeChild(link);
    };

    handleDownload();
  }
