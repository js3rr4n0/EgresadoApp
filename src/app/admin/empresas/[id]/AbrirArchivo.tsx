"use client";

// Abre un archivo guardado como data URL (organigramas) en una pestaña nueva, igual que el catálogo.
export default function AbrirArchivo({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  const abrir = () => {
    if (!url.startsWith("data:")) {
      window.open(url, "_blank");
      return;
    }
    try {
      const [cabecera, datos] = url.split(",");
      const mime = cabecera.match(/:(.*?);/)?.[1] || "application/pdf";
      const bytes = Uint8Array.from(atob(datos), (c) => c.charCodeAt(0));
      const enlace = URL.createObjectURL(new Blob([bytes], { type: mime }));
      window.open(enlace, "_blank");
      setTimeout(() => URL.revokeObjectURL(enlace), 1000);
    } catch {
      alert("No se pudo abrir el archivo.");
    }
  };
  return (
    <button type="button" onClick={abrir} className={className}>
      {children}
    </button>
  );
}
