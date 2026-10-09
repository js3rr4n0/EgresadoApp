// Reducción de imágenes en el navegador antes de subirlas (fotografías de la visita, anexos de las actividades).

const LADO_MAXIMO = 1600;

/** Reduce la imagen a un máximo de 1600 px por lado y la convierte a JPEG; si no se puede procesar, devuelve el original. */
export async function reducirImagen(archivo: File, nombre = "imagen.jpg"): Promise<File> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const factor = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * factor);
    canvas.height = Math.round(img.naturalHeight * factor);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], nombre, { type: "image/jpeg" }) : archivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}
