// Anexos y páginas que genera el sistema en el informe final (entrega F4; notas del 20-nov-2026):
//   - Involucrados: de la sección "Involucrados" de la propuesta (quién solicita o patrocina y las demás personas o
//     entidades), más el equipo y el asesor.
//   - Recursos: los recursos y el presupuesto del protocolo, más los cambios de recursos y costos de la bitácora (Q5).
//   - Derechos de autoría: hoja fija; mientras llega el texto oficial, uno provisional que el administrador edita (Q8).
// Módulo puro.
import type { BloqueDocumento } from "./documentoInformeFinal";
import type { EntradaBitacora } from "./bitacora";
import type { Espacio } from "./tipos";
import { bloquesRecursos } from "./documentoProtocolo";
import { DERECHOS_PROVISIONALES } from "./catalogo";

export interface DatosInvolucrados {
  /** Actores de la propuesta con su papel (vacíos o "N/A" no se muestran). */
  actores: { papel: string; nombre: string | null | undefined }[];
  /** "Otras personas o entidades involucradas" (una por línea: "nombre: participación"). */
  otros: string[];
  equipo: string[];
  asesor: string | null;
  /** Con qué palabra se nombra el trabajo (por defecto, la investigación). */
  trabajo?: "investigacion" | "proyecto";
}

export function bloquesInvolucrados(d: DatosInvolucrados): BloqueDocumento[] {
  const proyecto = d.trabajo === "proyecto";
  const filas: string[][] = [];
  for (const a of d.actores) {
    const nombre = a.nombre?.trim();
    if (nombre && nombre.toUpperCase() !== "N/A") filas.push([nombre, a.papel]);
  }
  for (const o of d.otros) {
    const [nombre, ...resto] = o.split(/:|—| - /);
    if (nombre?.trim()) filas.push([nombre.trim(), resto.join(":").trim() || (proyecto ? "Involucrado en el proyecto" : "Involucrado en la investigación")]);
  }
  for (const nombre of d.equipo) filas.push([nombre, proyecto ? "Integrante del equipo del proyecto" : "Integrante del equipo investigador"]);
  if (d.asesor) filas.push([d.asesor, "Asesor(a) del trabajo de graduación"]);
  if (!filas.length) return [{ tipo: "pendiente", texto: "Pendiente: la propuesta no registra personas o entidades involucradas." }];
  return [
    { tipo: "parrafos", parrafos: [proyecto ? "Personas y entidades involucradas en el proyecto, empezando por quien lo solicita o patrocina." : "Personas y entidades involucradas en la investigación, empezando por quien la solicita o patrocina."] },
    { tipo: "tabla", columnas: ["Persona o entidad", "Participación"], filas },
  ];
}

export function bloquesRecursosInforme(espacio: Pick<Espacio, "parametros"> | null, valor: string | null | undefined, bitacora: EntradaBitacora[]): BloqueDocumento[] {
  const r: BloqueDocumento[] = [];
  r.push({ tipo: "subtitulo", texto: "Recursos y presupuesto planificados" });
  r.push(...(espacio ? bloquesRecursos(espacio, valor, null) : [{ tipo: "pendiente" as const, texto: "La ficha no pide recursos en el protocolo." }]));
  const cambios = bitacora.filter((e) => e.tipo === "recursos");
  r.push({ tipo: "subtitulo", texto: "Cambios en recursos y costos durante la ejecución" });
  r.push(cambios.length
    ? { tipo: "lista", items: cambios.map((e) => `${e.codigo} ${e.titulo} (período ${e.periodo}): ${e.texto}`) }
    : { tipo: "parrafos", parrafos: ["No se reportaron cambios en los recursos o los costos durante la ejecución."] });
  return r;
}

export function bloquesDerechos(e: Pick<Espacio, "parametros">): BloqueDocumento[] {
  const parrafos = (Array.isArray(e.parametros.parrafos) ? e.parametros.parrafos : DERECHOS_PROVISIONALES).map(String).filter((x) => x.trim());
  return [{ tipo: "parrafos", parrafos: parrafos.length ? parrafos : DERECHOS_PROVISIONALES }];
}
