// Panel del asesor (specs/DASHBOARD_ASESOR.md, S2): pestañas «Antes de la ejecución» / «En ejecución» y procesos
// agrupados por modalidad. Sirve en servidor y cliente (solo muestra datos).

import Link from "next/link";
import type { ProcesoAsesor } from "@/lib/procesosAsesorServidor";
import { NOMBRE_ETAPA } from "@/lib/procesosAsesor";
import { fechaCortaSV } from "@/lib/fechasTexto";

export type PestanaAsesor = "propuesta" | "ejecucion";

const MODALIDADES: { clave: string; nombre: string }[] = [
  { clave: "pasantia", nombre: "Pasantía" },
  { clave: "proyecto", nombre: "Proyecto" },
  { clave: "investigacion", nombre: "Investigación" },
];

export function PestanasAsesor({
  activa,
  conteo,
}: {
  activa: PestanaAsesor;
  conteo: Record<PestanaAsesor, { total: number; pendientes: number }>;
}) {
  const pestanas: { clave: PestanaAsesor; nombre: string; ayuda: string }[] = [
    { clave: "propuesta", nombre: "Antes de la ejecución", ayuda: "Revisión de la propuesta y los 21 días" },
    { clave: "ejecucion", nombre: "En ejecución", ayuda: "Seguimiento y revisiones" },
  ];
  return (
    <nav role="tablist" aria-label="Etapas de tus procesos" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {pestanas.map((p) => {
        const sel = p.clave === activa;
        const c = conteo[p.clave];
        return (
          <Link
            key={p.clave}
            href={`/asesor?etapa=${p.clave}`}
            role="tab"
            aria-selected={sel}
            scroll={false}
            className={`flex items-center justify-between gap-3 rounded-xl border px-5 py-3.5 transition-colors ${sel ? "border-brand-red bg-white shadow-sm ring-1 ring-brand-red" : "border-border bg-white/70 hover:border-gray-400"}`}
          >
            <span className="min-w-0">
              <span className={`block text-sm font-bold ${sel ? "text-brand-red" : "text-gray-800"}`}>{p.nombre}</span>
              <span className="block text-[11px] text-muted">{p.ayuda}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-full border border-border bg-gray-50 px-2.5 py-0.5 text-xs font-bold text-gray-700" title="Procesos">
                {c.total} {c.total === 1 ? "proceso" : "procesos"}
              </span>
              {c.pendientes > 0 && (
                <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-xs font-bold text-white" title="Pendientes tuyos">
                  {c.pendientes} pendiente{c.pendientes === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Un bloque por modalidad (solo las que tienen procesos), con una tarjeta por proceso. */
export function BloquesModalidad({
  procesos,
  tarjeta,
  vacio,
  conPendiente = (p) => p.pendientesAsesor > 0,
}: {
  procesos: ProcesoAsesor[];
  tarjeta: (p: ProcesoAsesor) => React.ReactNode;
  vacio: string;
  /** Si el proceso espera algo del asesor (por defecto, sus pendientes de los 21 días o de la revisión). */
  conPendiente?: (p: ProcesoAsesor) => boolean;
}) {
  if (!procesos.length) {
    return <p className="rounded-xl border border-dashed border-border bg-white py-10 text-center text-sm text-gray-600">{vacio}</p>;
  }
  return (
    <div className="space-y-6">
      {MODALIDADES.map((m) => {
        const deM = procesos.filter((p) => p.tipo === m.clave);
        if (!deM.length) return null;
        const pend = deM.filter(conPendiente).length;
        return (
          <section key={m.clave} className="space-y-3">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
              <h2 className="text-lg font-bold text-card-dark">
                {m.nombre} <span className="text-sm font-semibold text-muted">· {deM.length} {deM.length === 1 ? "proceso" : "procesos"}</span>
              </h2>
              {pend > 0 && <span className="text-xs font-bold text-brand-red">{pend} con pendientes tuyos</span>}
            </header>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{deM.map((p) => <div key={p.id}>{tarjeta(p)}</div>)}</div>
          </section>
        );
      })}
    </div>
  );
}

/** Tarjeta básica de un proceso: quién, qué, en qué etapa y el acceso a «Ver progreso». */
export function TarjetaProceso({ p, children, acciones, resaltar }: { p: ProcesoAsesor; children?: React.ReactNode; acciones?: React.ReactNode; /** Borde rojo: espera algo del asesor. */ resaltar?: boolean }) {
  return (
    <article className={`h-full space-y-3 rounded-xl border bg-white p-4 shadow-sm ${(resaltar ?? p.pendientesAsesor > 0) ? "border-red-200" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
            N.º {p.numero} · Cohorte {p.cohorte}
          </p>
          <h3 className="font-bold leading-snug text-card-dark">{p.titulo}</h3>
          <p className="text-xs text-gray-700">
            {p.egresados.join(", ")}
            {p.carnet && p.egresados.length === 1 ? ` · ${p.carnet}` : ""}
          </p>
          <p className="text-[11px] text-muted">{[p.carrera, p.empresa].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="shrink-0 rounded-md border border-border bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-700">{NOMBRE_ETAPA[p.etapa]}</span>
      </div>
      {children}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Link href={`/asesor/propuestas/${p.id}`} className="rounded-lg bg-brand-red px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-red-hover">
          Ver progreso
        </Link>
        {acciones}
      </div>
    </article>
  );
}

const PASOS = ["Aceptada", "Revisión de la propuesta", "21 días", "Inicio de la ejecución"];

/**
 * S3 (specs/DASHBOARD_ASESOR.md): lo que el asesor ve de un proceso antes de la ejecución: la línea de pasos, el contador
 * de los 21 días (desde la presentación) y los requisitos, en rojo los pendientes y en verde los hechos.
 */
export function DetalleAntesEjecucion({ p }: { p: ProcesoAsesor }) {
  const paso = p.etapa === "pre_ejecucion" ? 2 : 1;
  const d = p.dias;
  return (
    <div className="space-y-3">
      {/* Línea de pasos */}
      <ol className="flex items-start" aria-label="Pasos antes de la ejecución">
        {PASOS.map((nombre, i) => {
          const hecho = i < paso;
          const actual = i === paso;
          return (
            <li key={nombre} className="relative flex flex-1 flex-col items-center text-center" aria-current={actual ? "step" : undefined}>
              {i > 0 && <span className={`absolute right-1/2 top-2 h-0.5 w-full ${i <= paso ? "bg-emerald-600" : "bg-gray-200"}`} aria-hidden="true" />}
              <span
                className={`relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 ${hecho ? "border-emerald-600 bg-emerald-600" : actual ? "border-brand-red bg-white" : "border-gray-300 bg-white"}`}
                aria-hidden="true"
              >
                {hecho && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                )}
              </span>
              <span className={`mt-1 text-[10px] leading-tight ${actual ? "font-bold text-brand-red" : hecho ? "text-gray-700" : "text-gray-400"}`}>{nombre}</span>
            </li>
          );
        })}
      </ol>

      {/* Contador de los 21 días */}
      {d && (
        <div
          className={`flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-3 py-2 ${d.retraso > 0 ? "border-red-300 bg-red-50" : d.restantes <= 5 ? "border-amber-300 bg-amber-50" : "border-border bg-gray-50"}`}
        >
          <span className={`text-sm font-bold ${d.retraso > 0 ? "text-red-800" : "text-gray-900"}`}>
            {d.retraso > 0 ? `${d.retraso} día${d.retraso === 1 ? "" : "s"} de retraso` : `Día ${d.transcurridos} de ${d.total}`}
          </span>
          <span className={`text-xs ${d.retraso > 0 ? "font-bold text-red-800" : "text-gray-600"}`}>
            {d.retraso > 0
              ? `Pasaron ${d.transcurridos} días desde la presentación`
              : d.restantes === 0
                ? "Hoy vence el plazo"
                : `Faltan ${d.restantes} día${d.restantes === 1 ? "" : "s"}`}
            {p.presentacion ? ` · presentada el ${fechaCortaSV(p.presentacion)}` : ""}
          </span>
        </div>
      )}

      {/* Lo que toca según la etapa */}
      {p.etapa === "revision" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
          Pendiente: revisa la propuesta y apruébala o pide ajustes. Al aprobarla siguen los requisitos de los 21 días.
        </p>
      )}
      {p.etapa === "ajustes" && (
        <p className="rounded-lg border border-border bg-gray-50 px-3 py-2 text-xs text-gray-700">
          Pediste ajustes: el equipo está corrigiendo la propuesta. Cuando la reenvíe, te tocará revisarla de nuevo.
        </p>
      )}
      {p.etapa === "pre_ejecucion" && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {p.requisitos.map((r) => {
            const noAplica = r.estado === "no_aplica";
            const hecho = !!r.estado && !noAplica;
            const tuyo = !hecho && !noAplica && r.responsable === "asesor";
            return (
              <li key={r.clave} className="flex items-start justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-gray-900">{r.nombre}</span>
                  {!hecho && !noAplica && <span className="block text-[11px] text-gray-600">{r.accion}</span>}
                </span>
                {noAplica ? (
                  <span className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-bold text-gray-500">No aplica</span>
                ) : hecho ? (
                  <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    Hecho · {fechaCortaSV(r.estado as string)}
                  </span>
                ) : (
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${tuyo ? "bg-red-700 text-white" : "border border-red-300 bg-red-50 text-red-800"}`}>
                    Pendiente · {tuyo ? "te toca" : "le toca al equipo"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export interface PorRevisarProceso {
  cantidad: number;
  /** Días que lleva esperando lo más antiguo. */
  diasMax: number;
  /** Lo más antiguo, para ir directo. */
  href: string;
}

export interface AvancePasantia {
  estatus: { id: string; label: string }[];
  periodo: number | null;
  subperiodo: number | null;
  porcentaje: number;
}

const ESTILO_ESTATUS_EJ: Record<string, string> = {
  semana: "border-red-200 bg-red-50 text-red-800",
  informe: "border-blue-200 bg-blue-50 text-blue-800",
  correccion: "border-amber-300 bg-amber-50 text-amber-900",
  atrasado: "border-red-300 bg-red-100 text-red-800",
  al_dia: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

/**
 * S4 (specs/DASHBOARD_ASESOR.md): lo que el asesor ve de un proceso en ejecución: lo que espera su revisión (de las
 * bandejas) y, en pasantía, el avance del cronograma que antes salía en «Seguimiento de actividades».
 */
export function DetalleEjecucion({ porRevisar, avance }: { porRevisar: PorRevisarProceso | null; avance: AvancePasantia | null }) {
  return (
    <div className="space-y-2.5">
      {porRevisar ? (
        <Link href={porRevisar.href} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 hover:bg-red-100">
          <span className="text-xs font-bold text-red-800">
            Pendiente · {porRevisar.cantidad} {porRevisar.cantidad === 1 ? "entrega por revisar" : "entregas por revisar"}
          </span>
          <span className="text-[11px] text-red-800">
            {porRevisar.diasMax === 0 ? "enviada hoy" : `la más antigua, hace ${porRevisar.diasMax} día${porRevisar.diasMax === 1 ? "" : "s"}`}
          </span>
        </Link>
      ) : (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Nada por revisar</p>
      )}
      {avance && (
        <div className="space-y-1.5">
          {avance.estatus.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {avance.estatus.map((e) => (
                <span key={e.id} className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${ESTILO_ESTATUS_EJ[e.id] ?? ESTILO_ESTATUS_EJ.al_dia}`}>{e.label}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-gray-600">
              {avance.periodo != null ? `Período ${avance.periodo}${avance.subperiodo != null ? `, subperíodo ${avance.subperiodo}` : ""}` : "Cronograma"}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={avance.porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del cronograma">
              <div className="h-full rounded-full bg-brand-red" style={{ width: `${avance.porcentaje}%` }} />
            </div>
            <span className="shrink-0 text-[11px] font-bold text-gray-700">{avance.porcentaje}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
