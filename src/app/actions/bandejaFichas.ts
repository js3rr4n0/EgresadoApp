"use server";

// Bandeja del asesor para proyecto e investigación (recorrido integral, H21). Junta en un solo lugar lo que espera su
// revisión en las propuestas con ficha: el plan de trabajo (con el protocolo, en investigación), los registros de la
// ejecución, los informes del período, las entregas de productos por objetivo y los capítulos del informe final. La
// bandeja de pasantía (registrosActividad.ts) no cambia.
import { db } from "@/lib/db";
import { entregasObjetivo, informesFinalesFicha, informesPlan, planesTrabajo, propuestas, registrosPlan, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq, inArray } from "drizzle-orm";
import { aplanar, type NodoPlan } from "@/lib/fichas/planTrabajo";
import type { EstadoDeCapitulo } from "@/lib/fichas/informeFinalFicha";

export type TipoBandejaFicha = "plan" | "registro" | "informe" | "objetivo" | "informe_final";

export interface EntradaBandejaFicha {
  clave: string;
  tipo: TipoBandejaFicha;
  propuestaId: number;
  modalidad: string;
  egresado: { nombreCompleto: string; carnet: string | null };
  titulo: string;
  detalle: string;
  enviadoEn: string | null;
  diasEsperando: number;
  href: string;
}

const MODALIDADES = ["proyecto", "investigacion"];

export async function getBandejaFichasAsesor(): Promise<{ entradas: EntradaBandejaFicha[]; tienePropuestas: boolean }> {
  const session = await getSession();
  if (!session || session.rol !== "asesor") return { entradas: [], tienePropuestas: false };
  const props = await db
    .select({ id: propuestas.id, tipo: propuestas.tipo, numero: propuestas.numero, egresadoId: propuestas.egresadoId, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet })
    .from(propuestas)
    .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
    .where(and(eq(propuestas.asesorId, session.userId), inArray(propuestas.tipo, MODALIDADES)));
  if (props.length === 0) return { entradas: [], tienePropuestas: false };
  const ids = props.map((p) => p.id);
  const prop = new Map(props.map((p) => [p.id, p]));
  const hoy = Date.now();
  const dias = (d: Date | string | null) => (d ? Math.max(0, Math.floor((hoy - new Date(d).getTime()) / 86_400_000)) : 0);
  const entradas: EntradaBandejaFicha[] = [];
  const base = (propuestaId: number) => {
    const p = prop.get(propuestaId)!;
    return { propuestaId, modalidad: p.tipo, egresado: { nombreCompleto: p.nombre, carnet: p.carnet } };
  };

  const planes = await db.select().from(planesTrabajo).where(inArray(planesTrabajo.propuestaId, ids));
  const nodos = new Map(planes.map((pl) => [pl.propuestaId, new Map(aplanar(pl.arbol as NodoPlan).map((n) => [n.id, n]))]));
  for (const pl of planes.filter((x) => x.estado === "enviado")) {
    const inv = prop.get(pl.propuestaId)!.tipo === "investigacion";
    entradas.push({
      ...base(pl.propuestaId), clave: `plan-${pl.id}`, tipo: "plan",
      titulo: inv ? "Protocolo y plan de trabajo" : "Plan de trabajo", detalle: inv ? "Dictamen escrito del protocolo y el plan" : "Aprobar u observar el plan",
      enviadoEn: pl.enviadoEn?.toISOString() ?? null, diasEsperando: dias(pl.enviadoEn), href: `/asesor/plan/${pl.propuestaId}${inv ? "?tab=plan" : ""}`,
    });
  }

  const regs = await db.select().from(registrosPlan).where(and(inArray(registrosPlan.propuestaId, ids), eq(registrosPlan.estado, "enviado")));
  for (const r of regs) {
    const n = nodos.get(r.propuestaId)?.get(r.nodoId);
    entradas.push({
      ...base(r.propuestaId), clave: `reg-${r.id}`, tipo: "registro",
      titulo: n ? `${n.codigo} ${n.titulo || "Sin título"}` : "Registro de la ejecución", detalle: `Período ${r.periodo}${r.avance === 100 ? " · al 100 %" : r.avance !== null ? ` · ${r.avance} %` : ""}`,
      enviadoEn: r.enviadoEn?.toISOString() ?? null, diasEsperando: dias(r.enviadoEn),
      href: `/asesor/ejecucion/${r.propuestaId}/actividad?nodo=${encodeURIComponent(r.nodoId)}&periodo=${r.periodo}`,
    });
  }

  const informes = await db.select().from(informesPlan).where(and(inArray(informesPlan.propuestaId, ids), eq(informesPlan.estado, "enviado")));
  for (const i of informes) {
    entradas.push({
      ...base(i.propuestaId), clave: `inf-${i.id}`, tipo: "informe",
      titulo: `Informe del período ${i.periodo}`, detalle: i.egresadoId === null ? "Informe general del equipo" : "Informe individual",
      enviadoEn: i.enviadoEn.toISOString(), diasEsperando: dias(i.enviadoEn), href: `/asesor/ejecucion/${i.propuestaId}/informe?periodo=${i.periodo}`,
    });
  }

  const entregas = await db.select().from(entregasObjetivo).where(and(inArray(entregasObjetivo.propuestaId, ids), eq(entregasObjetivo.estado, "enviado")));
  for (const e of entregas) {
    const n = nodos.get(e.propuestaId)?.get(e.nodoId);
    entradas.push({
      ...base(e.propuestaId), clave: `obj-${e.id}`, tipo: "objetivo",
      titulo: `Productos del objetivo ${n ? `${n.codigo} ${n.titulo}` : ""}`.trim(), detalle: "Productos y conclusión del objetivo",
      enviadoEn: e.enviadoEn?.toISOString() ?? null, diasEsperando: dias(e.enviadoEn), href: `/asesor/ejecucion/${e.propuestaId}/objetivo?nodo=${encodeURIComponent(e.nodoId)}`,
    });
  }

  const finales = await db.select().from(informesFinalesFicha).where(inArray(informesFinalesFicha.propuestaId, ids));
  for (const f of finales) {
    if (f.estado === "entregado") {
      entradas.push({
        ...base(f.propuestaId), clave: `if-${f.id}`, tipo: "informe_final", titulo: "Informe final completo", detalle: "Versión entregada para su dictamen",
        enviadoEn: f.entregadoEn?.toISOString() ?? null, diasEsperando: dias(f.entregadoEn), href: `/asesor/informe-final/${f.propuestaId}`,
      });
      continue;
    }
    const caps = Object.values((f.capitulos ?? {}) as Record<string, EstadoDeCapitulo>).filter((c) => c?.estado === "enviado");
    if (caps.length === 0) continue;
    const primero = caps.map((c) => c.enviadoEn).filter((x): x is string => !!x).sort()[0] ?? null;
    entradas.push({
      ...base(f.propuestaId), clave: `ifc-${f.id}`, tipo: "informe_final", titulo: `Informe final: ${caps.length} capítulo(s) por revisar`, detalle: "Revisión por capítulo",
      enviadoEn: primero, diasEsperando: dias(primero), href: `/asesor/informe-final/${f.propuestaId}`,
    });
  }

  entradas.sort((a, b) => b.diasEsperando - a.diasEsperando);
  return { entradas, tienePropuestas: true };
}
