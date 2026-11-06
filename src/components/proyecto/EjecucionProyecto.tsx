"use client";

// Ejecución del proyecto en equipo (entregas P4 y P5). Mismo diseño que "Reportes de actividades" de pasantía:
// encabezado, tarjeta de avance, actividades por pestañas (Período actual / Próximas / Completadas / Equipo) con su
// estado y apartados, y tarjetas de los informes del período. Cada actividad se registra en su propia página
// (RegistroActividadProyecto). Reglas: etapa de ejecución de la ficha; el servidor valida todo otra vez.
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarInformeGeneral, enviarInformeIndividual, revisarInformeGeneral, type DatosEjecucion } from "@/app/actions/ejecucionProyecto";
import { actividadesDelPeriodo, avancePorNodo, responsables, type NodoPlan } from "@/lib/fichas/planTrabajo";

export const ESTADO_ACTIVIDAD: Record<string, { label: string; badge: string; accion: string }> = {
  pendiente: { label: "Sin registrar", badge: "bg-slate-100 text-slate-600 border-slate-300", accion: "Registrar" },
  borrador: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300", accion: "Continuar" },
  enviado: { label: "Enviada", badge: "bg-blue-50 text-blue-800 border-blue-200", accion: "Ver" },
  observado: { label: "Con observaciones", badge: "bg-amber-50 text-amber-900 border-amber-300", accion: "Corregir" },
  aprobado: { label: "Aprobada", badge: "bg-emerald-50 text-emerald-800 border-emerald-200", accion: "Ver" },
};

const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  pendiente: { label: "Sin entregar", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Enviado, en revisión", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const fechaCorta = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-SV", { day: "numeric", month: "short" }) : "");
const fechaLarga = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—");
const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const tarjeta = "bg-white border border-slate-200 rounded-2xl shadow-sm";

/** Ruta de la actividad en el plan: objetivo específico › macroactividad › actividad. */
export function rutaEnPlan(raiz: NodoPlan, id: string): NodoPlan[] {
  const rec = (n: NodoPlan, camino: NodoPlan[]): NodoPlan[] | null => {
    if (n.id === id) return [...camino, n];
    for (const h of n.hijos) {
      const r = rec(h, [...camino, n]);
      if (r) return r;
    }
    return null;
  };
  return (rec(raiz, []) ?? []).slice(1);
}

/** Enlace a la página de registro de una actividad, según el rol. */
export function enlaceActividad(datos: DatosEjecucion, nodoId: string, periodo: number) {
  const id = datos.plan.propuesta.id;
  return datos.plan.rol === "asesor"
    ? `/asesor/ejecucion/${id}/actividad?nodo=${encodeURIComponent(nodoId)}&periodo=${periodo}`
    : `/egresado/ejecucion/actividad?id=${id}&nodo=${encodeURIComponent(nodoId)}&periodo=${periodo}`;
}

function Pastilla({ clase, children }: { clase: string; children: React.ReactNode }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border whitespace-nowrap ${clase}`}>{children}</span>;
}

type Pestana = "actual" | "proximas" | "completadas" | "equipo" | "revisar";

export default function EjecucionProyecto({ datos }: { datos: DatosEjecucion }) {
  const { plan, periodos, periodoActual, registros, reglas } = datos;
  const arbol = plan.plan.arbol;
  const esAsesor = plan.rol === "asesor";
  const [pestana, setPestana] = useState<Pestana>(esAsesor ? "revisar" : "actual");
  const [periodoEquipo, setPeriodoEquipo] = useState(periodoActual);

  const resp = useMemo(() => responsables(arbol), [arbol]);
  const regDe = (nodoId: string, periodo: number) => registros.find((r) => r.nodoId === nodoId && r.periodo === periodo);
  const nombre = (id: number | null | undefined) => plan.equipo.find((i) => i.id === id)?.nombre ?? "";
  // Avance acumulado: el último avance enviado de cada actividad; los niveles superiores promedian.
  const avance = useMemo(() => {
    const ultimo = new Map<string, { periodo: number; avance: number }>();
    for (const r of registros) {
      if (r.avance === null || r.estado === "borrador") continue;
      const u = ultimo.get(r.nodoId);
      if (!u || r.periodo > u.periodo) ultimo.set(r.nodoId, { periodo: r.periodo, avance: r.avance });
    }
    return avancePorNodo(arbol, new Map([...ultimo].map(([k, v]) => [k, v.avance])));
  }, [registros, arbol]);

  // Actividades (actividad + período) de todo el plan, para las pestañas.
  const todas = useMemo(
    () => periodos.flatMap((p) => actividadesDelPeriodo(arbol, p.numero, plan.columnas).map((a) => ({ a, periodo: p.numero }))),
    [periodos, arbol, plan.columnas]
  );
  const mias = todas.filter((x) => resp.get(x.a.id) === plan.miId);
  const estadoDe = (x: { a: NodoPlan; periodo: number }) => regDe(x.a.id, x.periodo)?.estado ?? "pendiente";
  const actual = mias.filter((x) => x.periodo === periodoActual);
  const proximas = mias.filter((x) => x.periodo > periodoActual);
  const completadas = (esAsesor ? todas : mias).filter((x) => ["enviado", "aprobado"].includes(estadoDe(x)) && (esAsesor ? estadoDe(x) === "aprobado" : true));
  const porRevisar = todas.filter((x) => estadoDe(x) === "enviado");
  const equipo = todas.filter((x) => x.periodo === periodoEquipo);

  const enviadasProyecto = todas.filter((x) => x.periodo <= periodoActual && ["enviado", "aprobado"].includes(estadoDe(x))).length;
  const planificadasHastaHoy = todas.filter((x) => x.periodo <= periodoActual).length;
  const avanceProyecto = avance.get(arbol.id) ?? 0;
  const p = periodos[periodoActual - 1];

  const pestanas: { id: Pestana; label: string; total: number }[] = esAsesor
    ? [
        { id: "revisar", label: "Por revisar", total: porRevisar.length },
        { id: "equipo", label: "Equipo por período", total: equipo.length },
        { id: "completadas", label: "Aprobadas", total: completadas.length },
      ]
    : [
        { id: "actual", label: "Período actual", total: actual.length },
        { id: "proximas", label: "Próximas", total: proximas.length },
        { id: "completadas", label: "Completadas", total: completadas.length },
        { id: "equipo", label: "Equipo", total: equipo.length },
      ];

  const filaActividad = (x: { a: NodoPlan; periodo: number }) => {
    const r = regDe(x.a.id, x.periodo);
    const estado = r?.estado ?? "pendiente";
    const info = ESTADO_ACTIVIDAD[estado] ?? ESTADO_ACTIVIDAD.pendiente;
    const indicadores = [
      ...(reglas.avance ? [{ label: `Avance ${r?.avance ?? 0}%`, ok: r?.avance != null }] : []),
      { label: `Acciones (${palabras(r?.acciones ?? "")} palabras)`, ok: !!r?.acciones.trim() },
      { label: `Resultado (${palabras(r?.resultado ?? "")} palabras)`, ok: !!r?.resultado.trim() },
      ...(reglas.marcoTeorico === "obligatorio" ? [{ label: "Marco teórico", ok: !!r?.marcoTeorico.trim() }] : []),
    ];
    const completos = indicadores.filter((i) => i.ok).length;
    const propia = resp.get(x.a.id) === plan.miId;
    const accion = esAsesor ? (estado === "enviado" ? "Revisar" : "Ver") : propia ? info.accion : "Ver";
    const bloqueada = !esAsesor && x.periodo > periodoActual;
    return (
      <li key={`${x.a.id}-${x.periodo}`} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-slate-500">{x.a.codigo}</span>
            <Pastilla clase={bloqueada ? "bg-slate-50 text-slate-400 border-slate-200" : info.badge}>{bloqueada ? "Bloqueada" : info.label}</Pastilla>
            <span className="text-[10px] font-bold text-slate-400">Período {x.periodo}</span>
            {(esAsesor || !propia) && <span className="text-[10px] font-bold text-slate-500">· {nombre(resp.get(x.a.id))}</span>}
          </div>
          <p className={`text-xs font-bold ${bloqueada ? "text-slate-400" : "text-slate-800"}`}>{x.a.titulo || "Actividad sin título"}</p>
          <p className="text-[11px] text-slate-500 font-semibold">{rutaEnPlan(arbol, x.a.id).slice(0, -1).map((n) => n.titulo).join(" › ")}</p>
          {!bloqueada && (
            <div className="flex flex-wrap items-center gap-1.5">
              {indicadores.map((i) => (
                <span key={i.label} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${i.ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-400 border-slate-200"}`}>
                  {i.label}
                </span>
              ))}
              <span className="text-[10px] text-slate-400 font-semibold">{completos} de {indicadores.length} apartados completos</span>
            </div>
          )}
          {r?.comentarioAsesor && estado === "observado" && <p className="text-[11px] text-amber-800 font-semibold">Observación del asesor: {r.comentarioAsesor}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {r?.enviadoEn && <span className="text-[10px] text-slate-400 font-semibold">Enviada: {new Date(r.enviadoEn).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" })}</span>}
          {bloqueada ? (
            <span className="text-[11px] text-slate-400 font-semibold">Se habilita el {fechaCorta(periodos[x.periodo - 1]?.desde ?? null)}</span>
          ) : propia || ["enviado", "observado", "aprobado"].includes(estado) ? (
            <Link href={enlaceActividad(datos, x.a.id, x.periodo)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${accion === "Ver" ? "border border-slate-200 text-slate-700 hover:bg-slate-100" : "bg-unicaes hover:bg-unicaes-hover text-white"}`}>
              {accion}
            </Link>
          ) : (
            <span className="text-[11px] text-slate-400 font-semibold">Sin registro</span>
          )}
        </div>
      </li>
    );
  };

  const lista = pestana === "actual" ? actual : pestana === "proximas" ? proximas : pestana === "completadas" ? completadas : pestana === "revisar" ? porRevisar : equipo;
  const vacio: Record<Pestana, string> = {
    actual: "No tiene actividades planificadas en el período actual.",
    proximas: "No tiene actividades en períodos posteriores.",
    completadas: esAsesor ? "Todavía no hay actividades aprobadas." : "Todavía no ha enviado actividades.",
    equipo: "No hay actividades planificadas en este período.",
    revisar: "No hay registros pendientes de revisión.",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Ejecución del proyecto</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Proyecto como Trabajo de Graduación · Propuesta #{plan.propuesta.numero} · {plan.propuesta.titulo}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={esAsesor ? `/asesor/plan/${plan.propuesta.id}` : "/egresado/plan"}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors w-fit">
            Plan de trabajo
          </Link>
          <Link href={esAsesor ? `/asesor/propuestas/${plan.propuesta.id}` : "/egresado"}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs transition-colors shadow-2xs w-fit">
            {esAsesor ? "Volver a la propuesta" : "Volver al panel principal"}
          </Link>
        </div>
      </div>

      {/* Avance del proyecto (en proyecto no hay métrica de páginas: se mide por el avance del plan) */}
      <div className={`${tarjeta} p-5 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Avance del proyecto</h2>
            <p className="mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{avanceProyecto}%</span>
              <span className="text-xs font-bold text-slate-500"> del objetivo general</span>
              <span className="text-[11px] font-semibold text-slate-400"> · período {periodoActual} de {periodos.length}{p?.desde ? ` (${fechaCorta(p.desde)} al ${fechaCorta(p.hasta)})` : ""}</span>
            </p>
          </div>
          <Pastilla clase="bg-slate-50 text-slate-700 border-slate-300">{enviadasProyecto} de {planificadasHastaHoy} actividades enviadas a la fecha</Pastilla>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-label="Avance del objetivo general">
          <div className="h-full bg-unicaes rounded-full" style={{ width: `${avanceProyecto}%` }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plan.equipo.map((i) => {
            const suyas = todas.filter((x) => resp.get(x.a.id) === i.id && x.periodo <= periodoActual);
            const env = suyas.filter((x) => ["enviado", "aprobado"].includes(estadoDe(x))).length;
            const apr = suyas.filter((x) => estadoDe(x) === "aprobado").length;
            return (
              <div key={i.id} className={`rounded-xl border px-4 py-3 space-y-2 ${i.id === plan.miId ? "border-unicaes bg-red-50/30" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">{i.nombre}{i.lider ? " · líder" : ""}</span>
                  <span className="text-[11px] font-bold text-slate-600">{env} de {suyas.length}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${suyas.length ? Math.round((env / suyas.length) * 100) : 0}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 font-semibold">{apr} aprobada{apr === 1 ? "" : "s"} por el asesor</p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {arbol.hijos.map((o) => (
            <span key={o.id} title={o.titulo} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${(avance.get(o.id) ?? 0) >= 100 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-600 border-slate-200"}`}>
              {o.codigo} · {avance.get(o.id) ?? 0}%
            </span>
          ))}
        </div>
        <details className="text-[11px] text-slate-500 font-medium">
          <summary className="cursor-pointer w-fit font-bold text-slate-600 hover:text-slate-900 select-none">Más información</summary>
          <p className="mt-2 leading-relaxed">
            Cada actividad toma el último avance que registró su responsable; cada objetivo y el objetivo general muestran el promedio
            de lo que contienen. {reglas.marcoTeorico === "opcional" ? "El marco teórico es opcional: úselo solo si hace falta contextualizar una actividad. " : ""}
            En proyecto no se exige un mínimo de páginas.
          </p>
        </details>
      </div>

      {/* Actividades */}
      <div className={tarjeta}>
        <div className="px-5 pt-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Actividades del plan de trabajo</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 max-w-2xl">
              {esAsesor
                ? "Revise los registros de cada integrante. Cada actividad indica quién es su responsable."
                : "Registre las actividades de su plan individual planificadas en el período y envíelas a su asesor designado. Cada integrante registra solo lo que está a su cargo."}
            </p>
          </div>
          {pestana === "equipo" && (
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 shrink-0">
              Período{" "}
              <select value={periodoEquipo} onChange={(e) => setPeriodoEquipo(Number(e.target.value))}
                className="ml-1 h-8 border border-slate-300 rounded-lg px-2 text-xs normal-case font-semibold text-slate-700">
                {periodos.map((x) => <option key={x.numero} value={x.numero}>{x.numero}{x.desde ? ` · ${fechaCorta(x.desde)}–${fechaCorta(x.hasta)}` : ""}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="flex gap-1 px-5 mt-4 border-b border-slate-200 overflow-x-auto" role="tablist">
          {pestanas.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={pestana === t.id} onClick={() => setPestana(t.id)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors whitespace-nowrap ${pestana === t.id ? "border-unicaes text-unicaes" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {t.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${pestana === t.id ? "bg-red-50 text-unicaes" : "bg-slate-100 text-slate-500"}`}>{t.total}</span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {pestana === "actual" && actual.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Período {periodoActual}{p?.desde && <span className="font-semibold text-slate-500"> · {fechaLarga(p.desde)} al {fechaLarga(p.hasta)}</span>}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {actual.filter((x) => ["enviado", "aprobado"].includes(estadoDe(x))).length} de {actual.length} actividades enviadas en este período
                </p>
              </div>
              <div className="w-full sm:w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.round((actual.filter((x) => ["enviado", "aprobado"].includes(estadoDe(x))).length / actual.length) * 100)}%` }} />
              </div>
            </div>
          )}
          {lista.length === 0 ? (
            <p className="text-xs text-slate-500 font-semibold">{vacio[pestana]}</p>
          ) : (
            <ul className={`divide-y divide-slate-100 border rounded-xl ${pestana === "proximas" ? "border-dashed border-slate-300" : "border-slate-200"}`}>{lista.map(filaActividad)}</ul>
          )}
        </div>
      </div>

      <InformesDelPeriodo datos={datos} />
    </div>
  );
}

/** Informes del período: una tarjeta por período, como en pasantía, y las acciones del período elegido (P5). */
export function InformesDelPeriodo({ datos }: { datos: DatosEjecucion }) {
  const router = useRouter();
  const { plan, informes, informe: modo, periodos, periodoActual } = datos;
  const [periodo, setPeriodo] = useState(periodoActual);
  const [comentario, setComentario] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const esAsesor = plan.rol === "asesor";
  const enlace = (de: string, n: number) =>
    esAsesor ? `/asesor/ejecucion/${plan.propuesta.id}/informe?periodo=${n}&de=${de}` : `/egresado/ejecucion/informe?id=${plan.propuesta.id}&periodo=${n}&de=${de}`;
  const de = (id: number | null, n: number) => informes.find((i) => i.periodo === n && i.egresadoId === id);
  const general = de(null, periodo);
  const mio = de(plan.miId, periodo);
  const ejecutar = (accion: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    iniciar(async () => {
      setMsg(null);
      const r = await accion();
      if (!r.success) return setMsg({ ok: false, texto: r.error ?? "No se pudo completar." });
      setMsg({ ok: true, texto: ok });
      router.refresh();
    });

  return (
    <div className={`${tarjeta} p-5 space-y-4`}>
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">Informes del período</h2>
        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
          Cada informe se compone automáticamente con las actividades registradas.{" "}
          {modo === "individual_y_general"
            ? "Cada integrante entrega su informe individual y, con todos, el líder envía el informe general a su asesor designado. La fecha de entrega es el último día del período."
            : "El líder envía el informe del período a su asesor designado. La fecha de entrega es el último día del período."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {periodos.map((x) => {
          const g = de(null, x.numero);
          const est = ESTADO_INFORME[g?.estado ?? "pendiente"];
          const abierto = x.numero <= periodoActual;
          const individuales = plan.equipo.filter((i) => de(i.id, x.numero)).length;
          return (
            <div key={x.numero}
              className={`p-4 bg-slate-50 border rounded-xl flex flex-col gap-2 ${x.numero === periodo ? "border-unicaes ring-1 ring-unicaes/30" : "border-slate-200"} ${abierto ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800">Informe {x.numero}</span>
                <Pastilla clase={est.badge}>{est.label}</Pastilla>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                <p>Entrega: {fechaLarga(x.hasta)}</p>
                {modo === "individual_y_general" && abierto && <p>Individuales: {individuales} de {plan.equipo.length}</p>}
                {!abierto && <p>Se habilita el {fechaCorta(x.desde)}</p>}
              </div>
              <div className="mt-auto flex flex-col gap-1.5 pt-1">
                <button type="button" disabled={!abierto} onClick={() => { setPeriodo(x.numero); setMsg(null); }}
                  className="text-center px-3 py-1.5 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-[11px] font-bold disabled:opacity-40">
                  {x.numero === periodo ? "Seleccionado" : "Gestionar"}
                </button>
                <a href={enlace("general", x.numero)} aria-disabled={!abierto}
                  className={`text-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-[11px] font-bold ${abierto ? "" : "pointer-events-none"}`}>
                  Ver documento
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Informe {periodo}: entregas del equipo</h3>
        <ul className="divide-y divide-slate-100 text-xs">
          {modo === "individual_y_general" && plan.equipo.map((i) => {
            const e = de(i.id, periodo);
            return (
              <li key={i.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-700">Informe individual · {i.nombre}</span>
                <span className="flex items-center gap-3">
                  <Pastilla clase={ESTADO_INFORME[e?.estado ?? "pendiente"].badge}>{ESTADO_INFORME[e?.estado ?? "pendiente"].label}</Pastilla>
                  <a href={enlace(String(i.id), periodo)} className="text-[11px] font-bold text-unicaes hover:underline">Ver documento</a>
                </span>
              </li>
            );
          })}
          <li className="py-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-slate-800">Informe general del período</span>
            <span className="flex items-center gap-3">
              <Pastilla clase={ESTADO_INFORME[general?.estado ?? "pendiente"].badge}>{ESTADO_INFORME[general?.estado ?? "pendiente"].label}</Pastilla>
              <a href={enlace("general", periodo)} className="text-[11px] font-bold text-unicaes hover:underline">Ver documento</a>
            </span>
          </li>
        </ul>
        {general?.estado === "observado" && general.comentarioAsesor && (
          <div className="p-3 bg-white border-2 border-amber-300 rounded-xl">
            <p className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wide">Observaciones del asesor</p>
            <p className="text-xs text-slate-700 font-medium">{general.comentarioAsesor}</p>
          </div>
        )}
        {msg && <div className={`p-3 rounded-xl border text-xs font-bold ${msg.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>{msg.texto}</div>}
        <div className="flex flex-wrap justify-end gap-2">
          {!esAsesor && modo === "individual_y_general" && (!mio || mio.estado === "observado") && (!general || general.estado === "observado") && (
            <button type="button" disabled={pendiente} onClick={() => ejecutar(() => enviarInformeIndividual(plan.propuesta.id, periodo), "Entregó su informe individual.")}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs disabled:opacity-50">
              Entregar mi informe individual
            </button>
          )}
          {plan.rol === "lider" && (!general || general.estado === "observado") && (
            <button type="button" disabled={pendiente}
              onClick={() => { if (window.confirm("¿Enviar al asesor el informe general del período?")) ejecutar(() => enviarInformeGeneral(plan.propuesta.id, periodo), "Informe general enviado al asesor."); }}
              className="px-5 py-2.5 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs shadow-md disabled:opacity-50">
              Enviar informe general
            </button>
          )}
        </div>
        {esAsesor && general?.estado === "enviado" && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} aria-label="Observación del informe general"
              placeholder="Observaciones para el equipo (obligatorias si solicita correcciones)"
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" disabled={pendiente} onClick={() => ejecutar(() => revisarInformeGeneral(plan.propuesta.id, periodo, "observar", comentario), "Observaciones enviadas al equipo.")}
                className="px-5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-extrabold text-xs disabled:opacity-50">
                Solicitar correcciones
              </button>
              <button type="button" disabled={pendiente} onClick={() => ejecutar(() => revisarInformeGeneral(plan.propuesta.id, periodo, "aprobar", comentario), "Informe general aprobado.")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs disabled:opacity-50">
                Aprobar informe general
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
