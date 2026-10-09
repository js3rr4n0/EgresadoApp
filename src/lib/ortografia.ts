import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import nspell from "nspell";

// Revisión ortográfica en español (diccionario Hunspell de dictionary-es). Se carga una sola vez por proceso.
let corrector: Promise<ReturnType<typeof nspell>> | null = null;

// Vocabulario técnico de uso común en los informes que el diccionario general no incluye.
const VOCABULARIO_TECNICO = [
  "entregable",
  "entregables",
  "hardware",
  "backend",
  "frontend",
  "framework",
  "frameworks",
  "login",
  "dashboard",
  "dashboards",
  "prototipado",
  "prototipar",
  "refactorización",
  "escalabilidad",
  "testing",
  "endpoint",
  "endpoints",
];

function cargarCorrector() {
  corrector ??= (async () => {
    const carpeta = path.join(process.cwd(), "node_modules", "dictionary-es");
    const [aff, dic] = await Promise.all([readFile(path.join(carpeta, "index.aff")), readFile(path.join(carpeta, "index.dic"))]);
    const spell = nspell(aff, dic);
    for (const palabra of VOCABULARIO_TECNICO) spell.add(palabra);
    return spell;
  })();
  return corrector;
}

/**
 * Palabras que el diccionario no reconoce. Se omiten las que inician con mayúscula (nombres propios, siglas, marcas) y
 * las de una o dos letras, para evitar falsos positivos; es una ayuda para el asesor, no un bloqueo.
 */
export async function palabrasDudosas(...textos: (string | null | undefined)[]): Promise<string[]> {
  const palabras = textos.join(" ").match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g) ?? [];
  const candidatas = [...new Set(palabras.filter((p) => p.length > 2 && p === p.toLowerCase()))];
  if (candidatas.length === 0) return [];
  try {
    const spell = await cargarCorrector();
    return candidatas.filter((p) => !spell.correct(p));
  } catch (err) {
    console.error("No se pudo cargar el diccionario de ortografía:", err);
    return [];
  }
}
