"use client";
// Seguimiento de cohortes del administrador (specs/SEGUIMIENTO_COHORTES.md, entrega K1).

import { useEffect, useState, useTransition } from "react";
import {
  getInformeFinalizando, getInformePreEjecucion, getInformeRecepcion, getResumenCierre, type ResumenCierre,
  type CohorteActiva, type FiltroInforme, type FilaAsesor, type FilaPreEjecucion, type FilaRecepcion, type FilaSeguimiento,
} from "@/app/actions/seguimientoCohortes";
import { aCsv, DIAS_PREEJECUCION, NOMBRE_REQUISITO, type ClaveRequisito } from "@/lib/seguimientoCohortes";

type Informe = "recepcion" | "preejecucion" | "seguimiento" | "asesores" | "terminados" | "cierre";
type DatosFinalizando = Extract<Awaited<ReturnType<typeof getInformeFinalizando>>, { success: true }>["datos"];
const DE_FINALIZANDO: Informe[] = ["seguimiento", "asesores", "terminados"];
const MODALIDAD: Record<string, string> = { pasantia: "Pasantía", proyecto: "Proyecto", investigacion: "Investigación" };
const CLAVES = Object.keys(NOMBRE_REQUISITO) as ClaveRequisito[];
const fechaCorta = (f: string | null) => (f ? new Date(`${f}T12:00:00`).toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

function descargar(nombre: string, filas: (string | number | null)[][]) {
  const url = URL.createObjectURL(new Blob([aCsv(filas)], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${nombre}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export default function SeguimientoCohortes({ cohortes, facultades, carreras }: {
  cohortes: CohorteActiva[]; facultades: { id: number; nombre: string }[]; carreras: { id: number; nombre: string; facultadId: number }[];
}) {
  const inicial = cohortes.find((c) => c.grupo === "comenzando") ?? cohortes[0];
  const [fin, setFin] = useState<DatosFinalizando | null>(null);
  const [cierre, setCierre] = useState<ResumenCierre | null>(null);
  const [cohorteId, setCohorteId] = useState<number | null>(inicial?.id ?? null);
  const [informe, setInforme] = useState<Informe>("recepcion");
  const [alcance, setAlcance] = useState<{ tipo: "general" | "facultad" | "carrera"; id: number | null }>({ tipo: "general", id: null });
  const [manual, setManual] = useState(false);
  const [rango, setRango] = useState({ desde: "", hasta: "" });
  const [recepcion, setRecepcion] = useState<{ rango: { desde: string; hasta: string; automatico: boolean }; filas: FilaRecepcion[]; total: FilaRecepcion } | null>(null);
  const [pre, setPre] = useState<Awaited<ReturnType<typeof getInformePreEjecucion>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, iniciar] = useTransition();

  const cohorte = cohortes.find((c) => c.id === cohorteId) ?? null;
  const filtro: FiltroInforme = {
    facultadId: alcance.tipo === "facultad" ? alcance.id : null,
    carreraId: alcance.tipo === "carrera" ? alcance.id : null,
    desde: manual ? rango.desde || null : null,
    hasta: manual ? rango.hasta || null : null,
  };
  const claveFiltro = JSON.stringify([cohorteId, informe, filtro]);

  useEffect(() => {
    if (!cohorteId) return;
    iniciar(async () => {
      setError(null);
      if (informe === "recepcion") {
        const r = await getInformeRecepcion(cohorteId, filtro);
        if (r.success) setRecepcion(r.datos); else setError(r.error);
      } else if (informe === "preejecucion") {
        const r = await getInformePreEjecucion(cohorteId, filtro);
        if (r.success) setPre(r); else setError(r.error);
      } else if (DE_FINALIZANDO.includes(informe)) {
        const r = await getInformeFinalizando(cohorteId, filtro);
        if (r.success) setFin(r.datos); else setError(r.error);
      } else if (informe === "cierre") {
        const r = await getResumenCierre(cohorteId, filtro);
        if (r.success) setCierre(r.datos); else setError(r.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFiltro]);

  const nombreAlcance = alcance.tipo === "general" ? "General"
    : alcance.tipo === "facultad" ? facultades.find((f) => f.id === alcance.id)?.nombre ?? "Facultad"
    : carreras.find((c) => c.id === alcance.id)?.nombre ?? "Carrera";
  const base = `${cohorte?.nombre ?? "cohorte"}-${nombreAlcance}`.replace(/[^\p{L}\p{N}-]+/gu, "_");

  const informes: { id: Informe; texto: string; grupo: string; listo: boolean }[] = [
    { id: "recepcion", texto: "Informe 1 · Recepción de propuestas", grupo: "Cohorte que comienza", listo: true },
    { id: "preejecucion", texto: "Informe 2 · Pre-ejecución (21 días)", grupo: "Cohorte que comienza", listo: true },
    { id: "seguimiento", texto: "Seguimiento y trabajos retrasados", grupo: "Cohorte que finaliza", listo: true },
    { id: "asesores", texto: "Asesores disponibles", grupo: "Cohorte que finaliza", listo: true },
    { id: "terminados", texto: "Procesos terminados y pendientes", grupo: "Cohorte que finaliza", listo: true },
    { id: "cierre", texto: "Resumen del cierre administrativo", grupo: "Cierre", listo: true },
  ];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-card-dark">Seguimiento de cohortes</h1>
        <p className="text-sm text-muted mt-1">
          Siempre hay dos cohortes activas a la vez: la que comienza y la que finaliza. Elige una para ver sus procesos y descargar sus informes.
        </p>
      </div>

      {/* Cohortes activas */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 print:hidden" aria-label="Cohortes activas">
        {cohortes.length === 0 && <p className="text-sm text-muted">No hay cohortes activas. Se activan en «Fechas y Periodos».</p>}
        {cohortes.map((c) => (
          <button key={c.id} type="button" onClick={() => setCohorteId(c.id)}
            className={`text-left rounded-xl border p-4 transition-colors ${c.id === cohorteId ? "border-brand-red bg-red-50/40 ring-2 ring-brand-red/20" : "border-border bg-white hover:border-gray-300"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-card-dark">{c.nombre}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${c.grupo === "comenzando" ? "bg-blue-50 text-blue-700" : c.grupo === "finalizando" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                {c.grupo === "comenzando" ? "Comenzando" : c.grupo === "finalizando" ? "Finalizando" : "—"}
              </span>
            </div>
            <div className="text-xs text-muted mt-1">{c.nombreFase}</div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div><div className="text-lg font-bold text-card-dark">{c.potenciales}</div><div className="text-[10px] text-muted">Egresados</div></div>
              <div><div className="text-lg font-bold text-card-dark">{c.propuestas}</div><div className="text-[10px] text-muted">Propuestas</div></div>
              <div><div className="text-lg font-bold text-card-dark">{c.enEjecucion}</div><div className="text-[10px] text-muted">En ejecución</div></div>
            </div>
            <div className="text-[10px] text-muted mt-3">
              Recepción {fechaCorta(c.fechas.inicioRecepcion)}–{fechaCorta(c.fechas.finRecepcion)} · Informe final {fechaCorta(c.fechas.maxInformeFinal)}
            </div>
          </button>
        ))}
      </section>

      {cohorte && (
        <>
          {/* Informes y filtros */}
          <section className="bg-white border border-border rounded-xl p-4 space-y-4 print:hidden">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Informes">
              {informes.map((i) => (
                <button key={i.id} type="button" role="tab" aria-selected={informe === i.id} onClick={() => setInforme(i.id)}
                  className={`text-xs font-bold rounded-lg px-3 py-2 border ${informe === i.id ? "bg-card-dark text-white border-card-dark" : "bg-white text-card-dark border-border hover:bg-gray-50"}`}>
                  <span className="block text-[9px] font-bold uppercase tracking-wider opacity-70">{i.grupo}</span>
                  {i.texto}{!i.listo && " · próximamente"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="seg-alcance" className="block text-[10px] font-bold uppercase tracking-widest text-card-dark mb-1">Alcance</label>
                <select id="seg-alcance" className="px-3 py-2 rounded-lg border border-border text-sm bg-white"
                  value={alcance.tipo === "general" ? "general" : `${alcance.tipo}:${alcance.id}`}
                  onChange={(e) => {
                    const [tipo, id] = e.target.value.split(":");
                    setAlcance(tipo === "general" ? { tipo: "general", id: null } : { tipo: tipo as "facultad" | "carrera", id: Number(id) });
                  }}>
                  <option value="general">General</option>
                  <optgroup label="Por facultad">{facultades.map((f) => <option key={f.id} value={`facultad:${f.id}`}>{f.nombre}</option>)}</optgroup>
                  <optgroup label="Por carrera">{carreras.map((c) => <option key={c.id} value={`carrera:${c.id}`}>{c.nombre}</option>)}</optgroup>
                </select>
              </div>
              <fieldset>
                <legend className="block text-[10px] font-bold uppercase tracking-widest text-card-dark mb-1">Periodicidad</legend>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-1"><input type="radio" name="seg-periodo" checked={!manual} onChange={() => setManual(false)} /> Automática</label>
                  <label className="flex items-center gap-1"><input type="radio" name="seg-periodo" checked={manual} onChange={() => setManual(true)} /> Elegir fechas</label>
                </div>
              </fieldset>
              {manual && (
                <div className="flex items-end gap-2">
                  <div>
                    <label htmlFor="seg-desde" className="block text-[10px] font-bold uppercase tracking-widest text-card-dark mb-1">Desde</label>
                    <input id="seg-desde" type="date" className="px-3 py-2 rounded-lg border border-border text-sm" value={rango.desde} onChange={(e) => setRango({ ...rango, desde: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="seg-hasta" className="block text-[10px] font-bold uppercase tracking-widest text-card-dark mb-1">Hasta</label>
                    <input id="seg-hasta" type="date" className="px-3 py-2 rounded-lg border border-border text-sm" value={rango.hasta} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} />
                  </div>
                </div>
              )}
              {cargando && <span className="text-xs text-muted">Actualizando…</span>}
            </div>
          </section>

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">{informes.find((i) => i.id === informe)?.texto} — {cohorte.nombre}</h1>
            <p className="text-sm">Alcance: {nombreAlcance} · Generado el {new Date().toLocaleDateString("es-SV")}</p>
          </div>

          {informe === "recepcion" && recepcion && <InformeRecepcion datos={recepcion} base={base} />}
          {informe === "preejecucion" && pre?.success && <InformePreEjecucion datos={pre.datos} base={base} />}
          {informe === "seguimiento" && fin && <InformeSeguimiento datos={fin} base={base} />}
          {informe === "asesores" && fin && <InformeAsesores datos={fin} base={base} />}
          {informe === "terminados" && fin && <InformeTerminados datos={fin} base={base} />}
          {informe === "cierre" && cierre && <InformeCierre datos={cierre} base={base} />}
        </>
      )}
    </div>
  );
}

function Acciones({ onCsv }: { onCsv: () => void }) {
  return (
    <div className="flex gap-2 print:hidden">
      <button type="button" onClick={onCsv} className="text-xs font-bold rounded-lg px-3 py-2 bg-card-dark text-white hover:bg-slate-700">Descargar CSV (Excel)</button>
      <button type="button" onClick={() => window.print()} className="text-xs font-bold rounded-lg px-3 py-2 border border-border bg-white hover:bg-gray-50">Imprimir o guardar PDF</button>
    </div>
  );
}

function Dato({ valor, texto, tono = "neutro" }: { valor: number | string; texto: string; tono?: "neutro" | "bien" | "alerta" | "mal" }) {
  const color = { neutro: "text-card-dark", bien: "text-emerald-600", alerta: "text-amber-600", mal: "text-brand-red" }[tono];
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className={`text-2xl font-bold ${color}`}>{valor}</div>
      <div className="text-xs text-muted mt-0.5">{texto}</div>
    </div>
  );
}

function InformeRecepcion({ datos, base }: { datos: { rango: { desde: string; hasta: string; automatico: boolean }; filas: FilaRecepcion[]; total: FilaRecepcion }; base: string }) {
  const { filas, total, rango } = datos;
  const pct = total.potenciales ? Math.round((total.recibidos.total / total.potenciales) * 100) : 0;
  const csv = () => descargar(`recepcion-${base}`, [
    ["Carrera", "Potenciales", "Recibidos pasantía", "Recibidos proyecto", "Recibidos investigación", "Recibidos total",
      "Pendientes pasantía", "Pendientes proyecto", "Pendientes investigación", "Pendientes sin propuesta", "Pendientes total", "Empresas", "Asesores"],
    ...[...filas, total].map((f) => [f.carrera, f.potenciales, f.recibidos.pasantia, f.recibidos.proyecto, f.recibidos.investigacion, f.recibidos.total,
      f.pendientes.pasantia, f.pendientes.proyecto, f.pendientes.investigacion, f.pendientes.sinPropuesta, f.pendientes.total, f.empresas, f.asesores]),
  ]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Recepción de propuestas</h2>
          <p className="text-xs text-muted">
            Propuestas entregadas del {fechaCorta(rango.desde)} al {fechaCorta(rango.hasta)}{rango.automatico ? " (automático: desde el inicio de la recepción hasta hoy)" : ""}.
            Cuenta personas: el líder y los integrantes aceptados de cada propuesta.
          </p>
        </div>
        <Acciones onCsv={csv} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Dato valor={total.potenciales} texto="Egresados potenciales" />
        <Dato valor={`${total.recibidos.total} (${pct} %)`} texto="Entregaron propuesta" tono="bien" />
        <Dato valor={total.pendientes.total} texto="Pendientes de entregar" tono={total.pendientes.total ? "alerta" : "bien"} />
        <Dato valor={total.empresas} texto="Empresas" />
        <Dato valor={total.asesores} texto="Asesores" />
      </div>
      <div className="bg-white border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark">
            <tr>
              <th rowSpan={2} className="text-left p-2">Carrera</th>
              <th rowSpan={2} className="p-2">Potenciales</th>
              <th colSpan={4} className="p-2 border-l border-border">Recibidos</th>
              <th colSpan={5} className="p-2 border-l border-border">Pendientes</th>
              <th rowSpan={2} className="p-2 border-l border-border">Empresas</th>
              <th rowSpan={2} className="p-2">Asesores</th>
            </tr>
            <tr>
              <th className="p-1 border-l border-border">Pas.</th><th className="p-1">Proy.</th><th className="p-1">Inv.</th><th className="p-1">Total</th>
              <th className="p-1 border-l border-border">Pas.</th><th className="p-1">Proy.</th><th className="p-1">Inv.</th><th className="p-1">Sin propuesta</th><th className="p-1">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.length === 0 && <tr><td colSpan={13} className="p-4 text-center text-muted">No hay egresados de esta cohorte en este alcance.</td></tr>}
            {[...filas, ...(filas.length > 1 ? [total] : [])].map((f) => (
              <tr key={f.carrera} className={f === total ? "font-bold bg-gray-50" : ""}>
                <td className="p-2">{f.carrera}</td>
                <td className="p-2 text-center">{f.potenciales}</td>
                <td className="p-2 text-center border-l border-border">{f.recibidos.pasantia}</td><td className="p-2 text-center">{f.recibidos.proyecto}</td>
                <td className="p-2 text-center">{f.recibidos.investigacion}</td><td className="p-2 text-center font-bold">{f.recibidos.total}</td>
                <td className="p-2 text-center border-l border-border">{f.pendientes.pasantia}</td><td className="p-2 text-center">{f.pendientes.proyecto}</td>
                <td className="p-2 text-center">{f.pendientes.investigacion}</td><td className="p-2 text-center">{f.pendientes.sinPropuesta}</td>
                <td className="p-2 text-center font-bold">{f.pendientes.total}</td>
                <td className="p-2 text-center border-l border-border">{f.empresas}</td><td className="p-2 text-center">{f.asesores}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted">Pendientes por modalidad: según la propuesta que están redactando. «Sin propuesta»: todavía no crean ninguna.</p>
    </section>
  );
}

/** Avisos de retraso: el sistema todavía no los envía; se muestra un ejemplo (specs/SEGUIMIENTO_COHORTES.md §2). */
function avisosEjemplo(f: FilaPreEjecucion): string {
  if (f.diasTranscurridos < 14) return "Ejemplo: sin avisos";
  return f.diasTranscurridos > DIAS_PREEJECUCION ? "Ejemplo: 2 avisos (día 14 y día 21) a ambos" : "Ejemplo: 1 aviso (día 14) a ambos";
}

function InformePreEjecucion({ datos, base }: { datos: { hoy: string; rango: { desde: string | null; hasta: string | null; automatico: boolean }; enPreEjecucion: FilaPreEjecucion[]; iniciadas: FilaPreEjecucion[]; cumplimiento: { dia7: number; dia14: number; dia21: number; pasaron21: number } }; base: string }) {
  const { enPreEjecucion, iniciadas, cumplimiento } = datos;
  const requisito = (f: FilaPreEjecucion, k: ClaveRequisito) => (f.requisitos[k] === "no_aplica" ? "No aplica" : f.requisitos[k] ? `Entregado ${fechaCorta(f.requisitos[k] as string)}` : "Pendiente");
  const csv = () => descargar(`pre-ejecucion-${base}`, [
    ["Propuesta", "Estado", "Modalidad", "Título", "Egresado", "Carnet", "Integrantes", "Carrera", "Asesor", "Coordinador", "Aprobada", "Días transcurridos",
      "Días para los 21", "Días de retraso", ...CLAVES.map((k) => NOMBRE_REQUISITO[k]), "Completó el día", "Fin estimado", "Riesgo de baja", "Avisos de retraso (ejemplo)"],
    ...[...enPreEjecucion, ...iniciadas].map((f) => [f.propuestaId, f.inicioEjecucion ? `Inició ${f.inicioEjecucion}` : "En pre-ejecución", MODALIDAD[f.modalidad] ?? f.modalidad, f.titulo,
      f.egresado, f.carnet, f.integrantes.join(", "), f.carrera, f.asesor, f.coordinador, f.fechaAprobacion, f.diasTranscurridos,
      f.inicioEjecucion ? "" : f.diasRestantes, f.diasRetraso, ...CLAVES.map((k) => requisito(f, k)), f.diaCompleto ?? "", f.finEstimado, f.riesgoBaja ? "Sí" : "No", avisosEjemplo(f)]),
  ]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Pre-ejecución: los 21 días antes de iniciar</h2>
          <p className="text-xs text-muted max-w-3xl">
            Desde que la propuesta se aprueba y se asigna hay {DIAS_PREEJECUCION} días para completar el plan de trabajo, los dictámenes de propuesta y de plan
            y el informe de primer contacto. Si se pasa, la fecha de fin del trabajo se corre esos días; si pasa del período técnico, hay riesgo de baja.
            {datos.rango.automatico ? " Muestra el estado de hoy." : ` Propuestas aprobadas del ${fechaCorta(datos.rango.desde)} al ${fechaCorta(datos.rango.hasta)}.`}
          </p>
        </div>
        <Acciones onCsv={csv} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Dato valor={enPreEjecucion.length} texto="En pre-ejecución hoy" />
        <Dato valor={cumplimiento.dia7} texto="Completaron al día 7" tono="bien" />
        <Dato valor={cumplimiento.dia14} texto="Completaron al día 14" tono="bien" />
        <Dato valor={cumplimiento.dia21} texto="Completaron al día 21" tono="bien" />
        <Dato valor={cumplimiento.pasaron21} texto="Pasaron de los 21 días" tono={cumplimiento.pasaron21 ? "mal" : "bien"} />
      </div>
      <p className="text-[11px] text-muted">Los conteos del día 7, 14 y 21 son acumulados e incluyen las {iniciadas.length} propuesta(s) que ya iniciaron la ejecución.</p>

      <div className="bg-white border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark text-left">
            <tr>
              <th className="p-2">Trabajo</th><th className="p-2">Egresado y asesor</th><th className="p-2 text-center">Días</th>
              <th className="p-2">Requisitos</th><th className="p-2">Fin estimado</th><th className="p-2">Avisos de retraso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border align-top">
            {enPreEjecucion.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted">No hay propuestas en pre-ejecución en este alcance.</td></tr>}
            {enPreEjecucion.map((f) => (
              <tr key={f.propuestaId}>
                <td className="p-2 min-w-[200px]">
                  <div className="font-bold text-card-dark">#{f.propuestaId} · {MODALIDAD[f.modalidad] ?? f.modalidad}</div>
                  <div className="text-xs text-muted">{f.titulo}</div>
                  <div className="text-[11px] text-muted">{f.carrera} · aprobada {fechaCorta(f.fechaAprobacion)}</div>
                </td>
                <td className="p-2 text-xs min-w-[170px]">
                  <div><span className="text-muted">Egresado:</span> {f.egresado}{f.carnet ? ` (${f.carnet})` : ""}</div>
                  {f.integrantes.length > 0 && <div className="text-muted">Con: {f.integrantes.join(", ")}</div>}
                  <div><span className="text-muted">Asesor:</span> {f.asesor ?? "Sin asignar"}</div>
                </td>
                <td className="p-2 text-center min-w-[110px]">
                  <div className="text-lg font-bold text-card-dark">{f.diasTranscurridos}</div>
                  <div className={`text-[11px] font-bold ${f.diasRestantes < 0 ? "text-brand-red" : f.diasRestantes <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                    {f.diasRestantes >= 0 ? `faltan ${f.diasRestantes}` : `${-f.diasRestantes} de retraso`}
                  </div>
                </td>
                <td className="p-2 text-xs min-w-[220px]">
                  <ul className="space-y-0.5">
                    {CLAVES.map((k) => (
                      <li key={k} className={f.requisitos[k] === "no_aplica" ? "text-muted" : f.requisitos[k] ? "text-emerald-700" : "text-brand-red"}>
                        {f.requisitos[k] === "no_aplica" ? "–" : f.requisitos[k] ? "✓" : "✗"} {NOMBRE_REQUISITO[k]}{f.requisitos[k] && f.requisitos[k] !== "no_aplica" ? ` (${fechaCorta(f.requisitos[k] as string)})` : f.requisitos[k] === "no_aplica" ? " (no aplica: sin supervisor)" : ""}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="p-2 text-xs min-w-[120px]">
                  <div>{fechaCorta(f.finEstimado)}</div>
                  {f.riesgoBaja && <div className="mt-1 inline-block text-[10px] font-bold uppercase rounded bg-red-50 text-brand-red px-1.5 py-0.5">Riesgo de baja</div>}
                </td>
                <td className="p-2 text-xs text-muted italic min-w-[150px]">{avisosEjemplo(f)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted">
        «Avisos de retraso» es un ejemplo: el sistema todavía no envía avisos automáticos de retraso (cuántos y en qué fecha se registrarán cuando existan).
      </p>
    </section>
  );
}

// ── Cohorte que finaliza (entrega K2) ──

const ESTADO_SEG: Record<FilaSeguimiento["estado"], { texto: string; clase: string }> = {
  terminado: { texto: "Terminado", clase: "bg-emerald-50 text-emerald-700" },
  al_dia: { texto: "Al día", clase: "bg-blue-50 text-blue-700" },
  retrasado: { texto: "Retrasado", clase: "bg-red-50 text-brand-red" },
};

function Corte({ datos }: { datos: DatosFinalizando }) {
  return (
    <p className="text-xs text-muted max-w-3xl">
      Estado de los trabajos en ejecución al <strong>{fechaCorta(datos.corte)}</strong>.{" "}
      {!datos.automatico ? "Corte elegido a mano (la fecha «hasta»)."
        : datos.diario ? "Último mes del período técnico: el corte es diario (hoy)."
        : `Corte automático cada 30 días desde el inicio del proceso${datos.proximo ? `; el próximo es el ${fechaCorta(datos.proximo)}` : ""}.`}
    </p>
  );
}

function InformeSeguimiento({ datos, base }: { datos: DatosFinalizando; base: string }) {
  const { filas } = datos;
  const retrasados = filas.filter((f) => f.estado === "retrasado");
  const agrupar = (clave: (f: FilaSeguimiento) => string) => [...new Set(filas.map(clave))].map((k) => {
    const g = filas.filter((f) => clave(f) === k);
    const r = g.filter((f) => f.estado === "retrasado");
    return { nombre: k, trabajos: g.length, retrasados: r.length, max: Math.max(0, ...r.map((f) => f.diasRetraso)), promedio: r.length ? Math.round(r.reduce((s, f) => s + f.diasRetraso, 0) / r.length) : 0 };
  }).sort((a, b) => b.retrasados - a.retrasados || a.nombre.localeCompare(b.nombre, "es"));
  const porAsesor = agrupar((f) => f.asesor ?? "Sin asesor");
  const porCarrera = agrupar((f) => f.carrera);
  const csv = () => descargar(`seguimiento-${base}-${datos.corte}`, [
    ["Corte", datos.corte],
    [],
    ["Propuesta", "Modalidad", "Título", "Egresado", "Integrantes", "Carrera", "Asesor", "Estado", "Días de retraso", "Atrasado en", "Entregados", "Vencidos", "Total", "Entregados tarde", "Observados por el asesor", "Informe final", "Avisos de retraso (ejemplo)"],
    ...filas.map((f) => [f.propuestaId, MODALIDAD[f.modalidad] ?? f.modalidad, f.titulo, f.egresado, f.integrantes.join(", "), f.carrera, f.asesor, ESTADO_SEG[f.estado].texto,
      f.diasRetraso, f.atrasadoEn.join("; "), f.entregados, f.vencidos, f.total, f.entregadosTarde, f.observados, f.informeFinal, avisosSeguimiento(f)]),
    [],
    ["Por asesor", "Trabajos", "Retrasados", "Retraso máximo (días)", "Retraso promedio (días)"],
    ...porAsesor.map((g) => [g.nombre, g.trabajos, g.retrasados, g.max, g.promedio]),
    [],
    ["Por carrera", "Trabajos", "Retrasados", "Retraso máximo (días)", "Retraso promedio (días)"],
    ...porCarrera.map((g) => [g.nombre, g.trabajos, g.retrasados, g.max, g.promedio]),
  ]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Seguimiento y trabajos retrasados</h2>
          <Corte datos={datos} />
        </div>
        <Acciones onCsv={csv} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Dato valor={filas.length} texto="Trabajos en ejecución" />
        <Dato valor={filas.filter((f) => f.estado === "al_dia").length} texto="Al día" tono="bien" />
        <Dato valor={retrasados.length} texto="Retrasados" tono={retrasados.length ? "mal" : "bien"} />
        <Dato valor={filas.filter((f) => f.estado === "terminado").length} texto="Terminados" tono="bien" />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        {[{ titulo: "Retrasos por asesor", filas: porAsesor }, { titulo: "Retrasos por carrera", filas: porCarrera }].map((t) => (
          <div key={t.titulo} className="bg-white border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark">
                <tr><th className="text-left p-2">{t.titulo}</th><th className="p-2">Trabajos</th><th className="p-2">Retrasados</th><th className="p-2">Máx. días</th><th className="p-2">Prom. días</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {t.filas.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-muted">Sin trabajos en ejecución.</td></tr>}
                {t.filas.map((g) => (
                  <tr key={g.nombre}><td className="p-2">{g.nombre}</td><td className="p-2 text-center">{g.trabajos}</td>
                    <td className={`p-2 text-center font-bold ${g.retrasados ? "text-brand-red" : ""}`}>{g.retrasados}</td><td className="p-2 text-center">{g.max}</td><td className="p-2 text-center">{g.promedio}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <TablaTrabajos filas={filas} />
      <p className="text-[11px] text-muted">
        Un trabajo está retrasado si al corte tiene un informe vencido sin enviar; los días son los del informe más atrasado. «Observados» son los
        informes a los que el asesor pidió correcciones (lo que se puede ver de los problemas que han tenido). «Avisos de retraso» es un ejemplo.
      </p>
    </section>
  );
}

function avisosSeguimiento(f: FilaSeguimiento) {
  return f.estado === "retrasado" ? `Ejemplo: ${Math.min(3, 1 + Math.floor(f.diasRetraso / 7))} aviso(s) a ambos` : "Ejemplo: sin avisos";
}

function TablaTrabajos({ filas, terminados = false }: { filas: FilaSeguimiento[]; terminados?: boolean }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark text-left">
          <tr>
            <th className="p-2">Trabajo</th><th className="p-2">Egresado y asesor</th><th className="p-2">Estado</th>
            <th className="p-2">{terminados ? "Informe final" : "En qué va atrasado"}</th><th className="p-2 text-center">Entregas</th>
            <th className="p-2">{terminados ? "Presentación pública" : "Avisos de retraso"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border align-top">
          {filas.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted">No hay trabajos en ejecución en este alcance.</td></tr>}
          {filas.map((f) => (
            <tr key={f.propuestaId}>
              <td className="p-2 min-w-[200px]">
                <div className="font-bold text-card-dark">#{f.propuestaId} · {MODALIDAD[f.modalidad] ?? f.modalidad}</div>
                <div className="text-xs text-muted">{f.titulo}</div>
                <div className="text-[11px] text-muted">{f.carrera}</div>
              </td>
              <td className="p-2 text-xs min-w-[170px]">
                <div><span className="text-muted">Egresado:</span> {f.egresado}</div>
                {f.integrantes.length > 0 && <div className="text-muted">Con: {f.integrantes.join(", ")}</div>}
                <div><span className="text-muted">Asesor:</span> {f.asesor ?? "Sin asignar"}</div>
              </td>
              <td className="p-2 min-w-[100px]">
                <span className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${ESTADO_SEG[f.estado].clase}`}>{ESTADO_SEG[f.estado].texto}</span>
                {f.diasRetraso > 0 && <div className="text-xs font-bold text-brand-red mt-1">{f.diasRetraso} días</div>}
              </td>
              <td className="p-2 text-xs min-w-[180px]">
                {terminados
                  ? ({ aprobado: "Aprobado", entregado: "Entregado, en revisión", pendiente: "Pendiente" } as const)[f.informeFinal]
                  : f.atrasadoEn.length ? f.atrasadoEn.join(" · ") : "—"}
              </td>
              <td className="p-2 text-xs text-center min-w-[110px]">
                <div>{f.entregados} de {f.total}</div>
                {f.entregadosTarde > 0 && <div className="text-amber-600">{f.entregadosTarde} tarde</div>}
                {f.observados > 0 && <div className="text-muted">{f.observados} observado(s)</div>}
              </td>
              <td className="p-2 text-xs text-muted italic min-w-[150px]">
                {terminados ? (f.informeFinal === "aprobado" ? "Ejemplo: pendiente de programar" : "—") : avisosSeguimiento(f)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const DISPONIBILIDAD: Record<FilaAsesor["disponibilidad"], { texto: string; clase: string; ayuda: string }> = {
  disponible: { texto: "Disponible", clase: "bg-emerald-50 text-emerald-700", ayuda: "Ya terminó todos sus trabajos de esta cohorte." },
  terminando: { texto: "Terminando", clase: "bg-blue-50 text-blue-700", ayuda: "Solo le falta el informe final de sus trabajos." },
  ocupado: { texto: "Ocupado", clase: "bg-gray-100 text-gray-600", ayuda: "Todavía tiene trabajos en curso." },
};

function InformeAsesores({ datos, base }: { datos: DatosFinalizando; base: string }) {
  const { asesores } = datos;
  const csv = () => descargar(`asesores-${base}-${datos.corte}`, [
    ["Asesor", "Disponibilidad", "Trabajos en la cohorte", "Terminados", "Retrasados", "Retraso máximo (días)", "Trabajos en otras cohortes activas"],
    ...asesores.map((a) => [a.asesor, DISPONIBILIDAD[a.disponibilidad].texto, a.trabajos, a.terminados, a.retrasados, a.diasRetrasoMax, a.enOtrasCohortes]),
  ]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Asesores que terminaron o están terminando</h2>
          <p className="text-xs text-muted max-w-3xl">Para asignarlos en la nueva cohorte. Se cuentan sus trabajos en ejecución de esta cohorte y los que ya llevan en otras cohortes activas.</p>
          <Corte datos={datos} />
        </div>
        <Acciones onCsv={csv} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(["disponible", "terminando", "ocupado"] as const).map((d) => (
          <Dato key={d} valor={asesores.filter((a) => a.disponibilidad === d).length} texto={DISPONIBILIDAD[d].texto} tono={d === "ocupado" ? "neutro" : "bien"} />
        ))}
      </div>
      <div className="bg-white border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark">
            <tr><th className="text-left p-2">Asesor</th><th className="p-2">Disponibilidad</th><th className="p-2">Trabajos</th><th className="p-2">Terminados</th>
              <th className="p-2">Retrasados</th><th className="p-2">Máx. días</th><th className="p-2">En otras cohortes</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {asesores.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted">No hay asesores con trabajos en ejecución en este alcance.</td></tr>}
            {asesores.map((a) => (
              <tr key={a.asesorId}>
                <td className="p-2">{a.asesor}</td>
                <td className="p-2 text-center"><span title={DISPONIBILIDAD[a.disponibilidad].ayuda} className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${DISPONIBILIDAD[a.disponibilidad].clase}`}>{DISPONIBILIDAD[a.disponibilidad].texto}</span></td>
                <td className="p-2 text-center">{a.trabajos}</td><td className="p-2 text-center">{a.terminados}</td>
                <td className={`p-2 text-center ${a.retrasados ? "font-bold text-brand-red" : ""}`}>{a.retrasados}</td>
                <td className="p-2 text-center">{a.diasRetrasoMax}</td><td className="p-2 text-center">{a.enOtrasCohortes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InformeTerminados({ datos, base }: { datos: DatosFinalizando; base: string }) {
  const { filas } = datos;
  const conFinal = filas.filter((f) => f.informeFinal !== "pendiente");
  const csv = () => descargar(`terminados-${base}-${datos.corte}`, [
    ["Propuesta", "Modalidad", "Título", "Egresado", "Carrera", "Asesor", "Estado", "Informe final", "Entregas", "Avisos de alerta en el proceso (ejemplo)", "Presentación pública (ejemplo)"],
    ...filas.map((f) => [f.propuestaId, MODALIDAD[f.modalidad] ?? f.modalidad, f.titulo, f.egresado, f.carrera, f.asesor, ESTADO_SEG[f.estado].texto, f.informeFinal,
      `${f.entregados} de ${f.total}`, `Ejemplo: ${f.entregadosTarde + f.observados}`, f.informeFinal === "aprobado" ? "Ejemplo: pendiente de programar" : ""]),
  ]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Procesos terminados y pendientes</h2>
          <p className="text-xs text-muted max-w-3xl">Todos los trabajos en ejecución, sin importar la fecha: si ya terminaron hasta el informe final y lo que les falta.</p>
          <Corte datos={datos} />
        </div>
        <Acciones onCsv={csv} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Dato valor={filas.filter((f) => f.informeFinal === "aprobado").length} texto="Informe final aprobado" tono="bien" />
        <Dato valor={filas.filter((f) => f.informeFinal === "entregado").length} texto="Informe final en revisión" />
        <Dato valor={filas.length - conFinal.length} texto="Sin informe final" tono={filas.length - conFinal.length ? "alerta" : "bien"} />
        <Dato valor="Ejemplo" texto="Presentaciones públicas pendientes" />
      </div>
      <TablaTrabajos filas={filas} terminados />
      <p className="text-[11px] text-muted">
        La presentación pública y los avisos de alerta son un ejemplo: el sistema todavía no agenda presentaciones ni envía avisos automáticos.
      </p>
    </section>
  );
}

// ── Resumen del cierre administrativo (entrega K3) ──

/** Calificación de asesores: todavía no existe la evaluación; se muestra un ejemplo (specs/SEGUIMIENTO_COHORTES.md §2). */
const CALIFICACION_EJEMPLO = [
  { asesor: "Asesor A (ejemplo)", promedio: 9.4, nivel: "Alta" },
  { asesor: "Asesor B (ejemplo)", promedio: 8.7, nivel: "Alta" },
  { asesor: "Asesor C (ejemplo)", promedio: 6.1, nivel: "Baja" },
];

function InformeCierre({ datos, base }: { datos: ResumenCierre; base: string }) {
  const pct = datos.egresados ? Math.round((datos.finalizaron / datos.egresados) * 100) : 0;
  const siguen = datos.empresas.filter((e) => e.sigue);
  const baja = datos.empresas.filter((e) => !e.sigue);
  const csv = () => descargar(`resumen-cierre-${base}-${datos.corte}`, [
    ["Resumen del cierre administrativo", `al ${datos.corte}`],
    ["Trabajos", datos.trabajos], ["Egresados", datos.egresados], ["Finalizaron el proceso", datos.finalizaron], ["Empresas que participaron", datos.empresas.length],
    ["Empresas que siguen", siguen.length], ["Empresas dadas de baja", baja.length],
    [],
    ["Por carrera", "Trabajos", "Egresados", "Finalizaron", "Empresas"],
    ...datos.porCarrera.map((c) => [c.carrera, c.trabajos, c.egresados, c.finalizaron, c.empresas]),
    [],
    ["Egresados por asesor", "Trabajos", "Egresados", "Finalizaron", "Empresas"],
    ...datos.porAsesor.map((a) => [a.asesor, a.trabajos, a.egresados, a.finalizaron, a.empresas.join(", ")]),
    [],
    ["Empresa", "Estado", "Trabajos", "Egresados", "Asesores", "Carreras"],
    ...datos.empresas.map((e) => [e.empresa, e.sigue ? "Sigue" : "Dada de baja", e.trabajos, e.egresados, e.asesores.join(", "), e.carreras.join(", ")]),
    [],
    ["Calificación de asesores (ejemplo)", "Promedio", "Nivel"],
    ...CALIFICACION_EJEMPLO.map((c) => [c.asesor, c.promedio, c.nivel]),
  ]);
  const tabla = (titulo: string, cols: string[], filas: (string | number)[][], vacio: string) => (
    <div className="bg-white border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark">
          <tr><th className="text-left p-2">{titulo}</th>{cols.map((c) => <th key={c} className="p-2">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.length === 0 && <tr><td colSpan={cols.length + 1} className="p-3 text-center text-muted">{vacio}</td></tr>}
          {filas.map((f, i) => <tr key={i}>{f.map((v, k) => <td key={k} className={`p-2 ${k === 0 ? "" : "text-center"}`}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Resumen del cierre administrativo</h2>
          <p className="text-xs text-muted max-w-3xl">
            Resumen de la cohorte al {fechaCorta(datos.corte)}: quiénes finalizaron, qué empresas participaron y con qué asesores. Úsalo al terminar la fecha
            administrativa; con «Elegir fechas», el resumen es a la fecha «hasta». El alcance (general, facultad o carrera) se elige arriba.
          </p>
        </div>
        <Acciones onCsv={csv} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Dato valor={`${datos.finalizaron} de ${datos.egresados}`} texto={`Egresados que finalizaron (${pct} %)`} tono="bien" />
        <Dato valor={datos.trabajos} texto="Trabajos" />
        <Dato valor={datos.empresas.length} texto="Empresas que participaron" />
        <Dato valor={siguen.length} texto="Empresas que siguen" tono="bien" />
        <Dato valor={baja.length} texto="Empresas dadas de baja" tono={baja.length ? "mal" : "neutro"} />
      </div>
      {tabla("Por carrera", ["Trabajos", "Egresados", "Finalizaron", "Empresas"], datos.porCarrera.map((c) => [c.carrera, c.trabajos, c.egresados, c.finalizaron, c.empresas]), "Sin trabajos en este alcance.")}
      <div className="grid lg:grid-cols-2 gap-3">
        {tabla("Egresados por asesor", ["Egresados", "Finalizaron", "Empresas"], datos.porAsesor.map((a) => [a.asesor, a.egresados, a.finalizaron, a.empresas.join(", ") || "—"]), "Sin asesores.")}
        {tabla("Asesor por empresa", ["Estado", "Asesores", "Egresados"], datos.empresas.map((e) => [e.empresa, e.sigue ? "Sigue" : "Dada de baja", e.asesores.join(", ") || "—", e.egresados]), "Ningún trabajo registró empresa.")}
      </div>
      <div>
        {tabla("Calificación de asesores (ejemplo)", ["Promedio", "Nivel"], CALIFICACION_EJEMPLO.map((c) => [c.asesor, c.promedio, c.nivel]), "")}
        <p className="text-[11px] text-muted mt-1">La calificación de asesores es un ejemplo: el sistema todavía no tiene la evaluación de asesores.</p>
      </div>
      <p className="text-[11px] text-muted">
        «Finalizaron»: el informe final está aprobado. Cuenta personas (líder e integrantes). «Dada de baja»: la empresa está deshabilitada en el catálogo de empresas.
      </p>
    </section>
  );
}
