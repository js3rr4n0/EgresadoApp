// Documento del protocolo de investigación (ajustes al protocolo, 19-nov-2026): las partes que genera el sistema para
// la vista de impresión (PDF) y el Word, con el mismo formato que el informe final (documentoInformeFinal.ts):
// el cronograma, que sale del plan de trabajo, y los recursos con el presupuesto calculado. Módulo puro.
import type { BloqueDocumento } from "./documentoInformeFinal";
import { aplanar, totalesNodo, type NodoPlan } from "./planTrabajo";
import { CATEGORIAS_RECURSO, formatoMonto, leerRecursos, presupuesto, reglasRecursos, totalRecurso } from "./recursos";
import type { Espacio } from "./tipos";

/**
 * Cronograma de actividades: objetivos específicos, macroactividades y actividades (con su código) y, por período, una
 * marca donde se ejecutan. Un nivel superior se marca si alguna de sus actividades se ejecuta en el período.
 */
export function bloquesCronograma(arbol: NodoPlan, columnas: { periodo: number }[]): BloqueDocumento[] {
  const periodos = [...new Set(columnas.map((c) => c.periodo))].sort((a, b) => a - b);
  const nodos = aplanar(arbol).filter((n) => n.nivel >= 2 && n.nivel <= 4);
  if (nodos.length === 0) return [{ tipo: "pendiente", texto: "Pendiente: el plan de trabajo todavía no tiene actividades." }];
  const filas = nodos.map((n) => {
    const totales = totalesNodo(n, columnas.length);
    return [
      n.codigo,
      `${n.nivel === 3 ? "  " : n.nivel === 4 ? "    " : ""}${n.titulo || "Sin título"}`,
      ...periodos.map((p) => (columnas.some((c, i) => c.periodo === p && (totales[i] ?? 0) > 0) ? "■" : "")),
    ];
  });
  return [
    { tipo: "parrafos", parrafos: ["Actividades del plan de trabajo por período de ejecución. ■ indica el período en que se realiza cada actividad."] },
    { tipo: "tabla", columnas: ["Código", "Objetivo, macroactividad o actividad", ...periodos.map((p) => `P${p}`)], filas },
  ];
}

/** Recursos por categoría y presupuesto (total por categoría y total general), como tablas. */
export function bloquesRecursos(e: Pick<Espacio, "parametros">, valor: string | null | undefined, numero: number | null = null): BloqueDocumento[] {
  const sub = (k: number, t: string) => `${numero ? `${numero}.${k} ` : ""}${t}`;
  const reglas = reglasRecursos(e);
  const recursos = leerRecursos(valor);
  if (recursos.length === 0) return [{ tipo: "pendiente", texto: "Pendiente: todavía no se registraron recursos." }];
  const etiqueta = (c: string) => CATEGORIAS_RECURSO.find((x) => x.valor === c)?.etiqueta ?? c;
  const orden = (c: string) => CATEGORIAS_RECURSO.findIndex((x) => x.valor === c);
  const ordenados = [...recursos].sort((a, b) => orden(a.categoria) - orden(b.categoria));
  if (!reglas.conCostos) {
    return [{ tipo: "tabla", columnas: ["Categoría", "Recurso"], filas: ordenados.map((r) => [etiqueta(r.categoria), r.descripcion]) }];
  }
  const p = presupuesto(recursos);
  const m = (n: number) => formatoMonto(n, reglas.moneda);
  return [
    { tipo: "subtitulo", texto: sub(1, "Recursos") },
    {
      tipo: "tabla",
      columnas: ["Categoría", "Recurso", "Cantidad", "Costo unitario", "Total"],
      filas: ordenados.map((r) => [etiqueta(r.categoria), r.descripcion, String(r.cantidad ?? ""), m(r.costoUnitario ?? 0), m(totalRecurso(r))]),
    },
    { tipo: "subtitulo", texto: sub(2, "Presupuesto") },
    {
      tipo: "tabla",
      columnas: ["Categoría", "Recursos", "Total"],
      filas: [...p.porCategoria.map((x) => [x.etiqueta, String(x.recursos), m(x.total)]), ["Total general", String(recursos.length), m(p.total)]],
    },
  ];
}
