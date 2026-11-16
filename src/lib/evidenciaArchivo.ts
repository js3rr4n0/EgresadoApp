// Lectura y validación de una evidencia enviada por formulario (imagen PNG/JPG, documento PDF o enlace). La comparten
// las evidencias de actividad (evidenciasPlan.ts) y los productos por objetivo (entregasObjetivo.ts). Solo servidor.
import { leerFuenteImagen, leerOrigenImagen, validarOrigenImagen, type FuenteImagen } from "@/lib/fuenteImagen";
import { MAX_CARACTERES_LEYENDA } from "@/lib/reglasRegistroActividad";

const MB = 1024 * 1024;
const MAX_IMAGEN = 8 * MB;
const MAX_DOCUMENTO = 10 * MB;

export interface ValoresEvidencia {
  tipo: "imagen" | "documento" | "enlace";
  url: string;
  nombre: string | null;
  leyenda: string;
  origen: string | null;
  fuente: FuenteImagen | null;
}

function leerOrigen(formData: FormData) {
  const origen = leerOrigenImagen(formData.get("origen"));
  let fuente: FuenteImagen | null = null;
  try {
    fuente = leerFuenteImagen(JSON.parse(String(formData.get("fuente") || "null")));
  } catch {
    fuente = null;
  }
  return { origen, fuente: origen === "externa" ? fuente : null };
}

const enlaceValido = (t: string) => {
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export async function leerEvidenciaFormulario(formData: FormData): Promise<{ ok: true; valores: ValoresEvidencia } | { ok: false; error: string }> {
  const tipo = String(formData.get("tipo"));
  const leyenda = String(formData.get("leyenda") || "").trim();
  if (leyenda.length < 3) return { ok: false, error: "Escribe una descripción breve de la evidencia." };
  if (leyenda.length > MAX_CARACTERES_LEYENDA) return { ok: false, error: `La descripción admite como máximo ${MAX_CARACTERES_LEYENDA} caracteres.` };

  if (tipo === "enlace") {
    const url = String(formData.get("url") || "").trim();
    if (!enlaceValido(url)) return { ok: false, error: "El enlace debe ser una dirección completa (https://…)." };
    return { ok: true, valores: { tipo, url: url.slice(0, 2000), nombre: null, leyenda, origen: null, fuente: null } };
  }
  if (tipo !== "imagen" && tipo !== "documento") return { ok: false, error: "Tipo de evidencia no válido." };
  const raw = formData.get("archivo");
  if (!raw || typeof raw === "string") return { ok: false, error: "Selecciona un archivo." };
  const archivo = raw as File;
  if (tipo === "imagen") {
    if (!/^image\/(png|jpe?g)$/.test(archivo.type)) return { ok: false, error: "La imagen debe ser PNG o JPG." };
    if (archivo.size > MAX_IMAGEN) return { ok: false, error: "La imagen excede el tamaño máximo de 8 MB." };
  } else {
    if (archivo.type !== "application/pdf") return { ok: false, error: "El documento debe ser un PDF." };
    if (archivo.size > MAX_DOCUMENTO) return { ok: false, error: "El documento excede el tamaño máximo de 10 MB." };
  }
  const { origen, fuente } = tipo === "imagen" ? leerOrigen(formData) : { origen: null, fuente: null };
  if (tipo === "imagen") {
    const problemas = validarOrigenImagen(origen, fuente);
    if (problemas.length > 0) return { ok: false, error: problemas[0] };
  }
  const buffer = Buffer.from(await archivo.arrayBuffer());
  return {
    ok: true,
    valores: { tipo, url: `data:${archivo.type};base64,${buffer.toString("base64")}`, nombre: archivo.name.slice(0, 255) || null, leyenda, origen, fuente },
  };
}
