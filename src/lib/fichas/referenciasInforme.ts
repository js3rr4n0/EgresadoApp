// Citas y referencias separadas de la bibliografía (informe final de investigación, entrega F3; notas del 20-nov-2026).
//   - "Citas y referencias": las fuentes que se citaron dentro del informe.
//   - "Bibliografía": las que se consultaron o analizaron pero no se citaron.
// Una fuente del registro está citada si se usó en un párrafo citado o en la metodología del plan, o si su autor y su
// año aparecen como cita en el texto. Una referencia escrita a mano, si su autor y su año aparecen como cita. Módulo puro.
import { citasEnTexto } from "./apartadosAcademicos";

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const ordenar = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

export function separarReferencias(args: {
  /** Textos del informe donde se buscan las citas (sin los capítulos de referencias y bibliografía). */
  textos: string[];
  /** Fuentes del registro citadas por id (párrafos citados, metodología del plan). */
  idsCitados: number[];
  registro: { id: number; referencia: string }[];
  /** Referencias escritas a mano en el capítulo de bibliografía. */
  manuales: string[];
}): { citadas: string[]; bibliografia: string[] } {
  const citas = citasEnTexto(args.textos.join("\n"));
  const citada = (ref: string) => {
    const r = sinTildes(ref);
    return citas.some((c) => r.startsWith(sinTildes(c.autor)) && (c.anio.startsWith("s") || r.includes(c.anio)));
  };
  const ids = new Set(args.idsCitados);
  const citadas: string[] = [];
  const bibliografia: string[] = [];
  for (const f of args.registro) (ids.has(f.id) || citada(f.referencia) ? citadas : bibliografia).push(f.referencia);
  for (const m of args.manuales) (citada(m) ? citadas : bibliografia).push(m);
  const enCitadas = new Set(ordenar(citadas).map(sinTildes));
  return { citadas: ordenar(citadas), bibliografia: ordenar(bibliografia).filter((b) => !enCitadas.has(sinTildes(b))) };
}
