export function openDocument(url: string, defaultTitle: string = "Documento") {
  if (!url) return;

  // If it's a base64 data URL
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(";base64,");
      if (parts.length === 2) {
        const contentType = parts[0].replace("data:", "");
        const base64Data = parts[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType || "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          alert("Por favor permite las ventanas emergentes (pop-ups) en tu navegador para ver el documento.");
        }
        return;
      }
    } catch (err) {
      console.error("Error al convertir documento base64:", err);
    }
  }

  // Regular HTTP(S) or Blob URL
  const win = window.open(url, "_blank");
  if (!win) {
    alert("Por favor permite las ventanas emergentes (pop-ups) en tu navegador para ver el documento.");
  }
}
