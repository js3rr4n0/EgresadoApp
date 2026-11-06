"use client";

// Registro de una actividad del plan en la ejecución del proyecto (entrega P4), con el mismo diseño que el registro
// de actividad de pasantía: tarjetas por apartado, cuadro de redacción con conteo de palabras y acciones al final.
// El responsable de la actividad la redacta y la envía; el asesor la revisa (aprueba o solicita correcciones).
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarRegistroPlan, revisarRegistroPlan, type DatosEjecucion } from "@/app/actions/ejecucionProyecto";
import { actividadesDelPeriodo, aplanar, arrastradasAlPeriodo, responsables, validarRegistroProyecto } from "@/lib/fichas/planTrabajo";
import TextoRedaccion from "@/app/egresado/reportes/actividad/[actividadId]/TextoRedaccion";
import { rutaEnPlan, enlaceActividad, ESTADO_ACTIVIDAD } from "./EjecucionProyecto";
import EvidenciasActividad from "./EvidenciasActividad";
import type { EvidenciaCompleta } from "@/app/actions/evidenciasPlan";

const ESTADO_BANNER: Record<string, { className: string; title: string }> = {
  enviado: { className: "bg-blue-50 border-blue-200 text-blue-900", title: "Esta actividad fue enviada y está en revisión por su asesor designado." },
  aprobado: { className: "bg-emerald-50 border-emerald-200 text-emerald-900", title: "Esta actividad fue revisada y aprobada por su asesor designado." },
};

const tarjeta = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3";
const tituloTarjeta = "text-sm font-extrabold text-slate-900 uppercase tracking-wide";
const fechaLarga = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" }) : "—");

/** Rango de palabras para TextoRedaccion: solo si la ficha fija mínimo y máximo (0 = sin métrica). */
const rango = (r: { min: number; max: number }) => (r.min > 0 && r.max > 0 ? { minimo: r.min, maximo: r.max } : {});
const textoRango = (r: { min: number; max: number }) =>
  r.min > 0 && r.max > 0 ? `entre ${r.min} y ${r.max} palabras` : r.min > 0 ? `al menos ${r.min} palabras` : r.max > 0 ? `hasta ${r.max} palabras` : "sin límite de palabras";

export default function RegistroActividadProyecto({
  datos,
  nodoId,
  periodo,
  evidencias,
}: {
  datos: DatosEjecucion;
  nodoId: string;
  periodo: number;
  evidencias: EvidenciaCompleta[];
}) {
  const router = useRouter();
  const { plan, reglas, periodos, registros, periodoActual } = datos;
  const arbol = plan.plan.arbol;
  const esAsesor = plan.rol === "asesor";
  const nodo = aplanar(arbol).find((n) => n.id === nodoId)!;
  const resp = responsables(arbol);
  const responsable = plan.equipo.find((i) => i.id === resp.get(nodoId));
  const registro = registros.find((r) => r.nodoId === nodoId && r.periodo === periodo);
  const estado = registro?.estado ?? "pendiente";
  const propia = resp.get(nodoId) === plan.miId;
  const editable = !esAsesor && propia && (estado === "pendiente" || estado === "borrador" || estado === "observado");
  const p = periodos[periodo - 1];

  // Posición dentro de las actividades del período a cargo del mismo responsable (como "Actividad n de m").
  const conArrastre = reglas.avance && periodo <= periodoActual ? registros : null;
  const vieneDe = conArrastre ? arrastradasAlPeriodo(arbol, periodo, plan.columnas, conArrastre).get(nodoId) : undefined;
  const delPeriodo = actividadesDelPeriodo(arbol, periodo, plan.columnas, conArrastre).filter((a) => resp.get(a.id) === resp.get(nodoId));
  const posicion = delPeriodo.findIndex((a) => a.id === nodoId);
  const siguiente = delPeriodo[posicion + 1] ?? null;
  const cols = plan.columnas.map((c, i) => (c.periodo === periodo ? i : -1)).filter((i) => i >= 0);
  const montoPeriodo = cols.reduce((s, i) => s + (nodo.montos[i] ?? 0), 0);

  const [avance, setAvance] = useState<string>(registro?.avance != null ? String(registro.avance) : "");
  const [acciones, setAcciones] = useState(registro?.acciones ?? "");
  const [resultado, setResultado] = useState(registro?.resultado ?? "");
  const [marco, setMarco] = useState(registro?.marcoTeorico ?? "");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState<"borrador" | "siguiente" | "enviar" | "revisar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const valores = { avance: avance === "" ? null : Number(avance), acciones, resultado, marcoTeorico: marco };
  const limiteEvidencias = datos.evidencias;
  const pendientes = [
    ...validarRegistroProyecto(valores, reglas, nodo.nivel === 5),
    ...(limiteEvidencias.max > 0 && evidencias.length < limiteEvidencias.min ? [`Adjunte al menos ${limiteEvidencias.min} evidencia(s).`] : []),
  ];
  const volver = esAsesor ? `/asesor/ejecucion/${plan.propuesta.id}` : "/egresado/ejecucion";

  async function guardar(modo: "borrador" | "siguiente" | "enviar") {
    setError(null);
    setOkMsg(null);
    setProblemas([]);
    setSaving(modo);
    const res = await guardarRegistroPlan(plan.propuesta.id, nodoId, periodo, valores, modo === "enviar");
    setSaving(null);
    if (!res.success) {
      setError(res.error);
      setProblemas(res.problemas ?? []);
      return;
    }
    if (modo === "borrador") {
      setOkMsg("Borrador guardado correctamente.");
      router.refresh();
    } else if (modo === "siguiente" && siguiente) {
      router.push(enlaceActividad(datos, siguiente.id, periodo));
    } else {
      router.push(volver);
    }
  }

  async function revisar(decision: "aprobar" | "observar") {
    if (!registro) return;
    setError(null);
    setSaving("revisar");
    const res = await revisarRegistroPlan(plan.propuesta.id, registro.id, decision, comentario);
    setSaving(null);
    if (!res.success) return setError(res.error);
    router.push(volver);
  }

  const banner = ESTADO_BANNER[estado];
  const info = ESTADO_ACTIVIDAD[estado] ?? ESTADO_ACTIVIDAD.pendiente;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{esAsesor ? "Revisión de actividad" : "Registro de actividad"}</h1>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Actividad {posicion + 1} de {delPeriodo.length} del Período {periodo}{responsable ? ` a cargo de ${responsable.nombre}` : ""}
          </p>
        </div>
        <Link href={volver} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs transition-colors shadow-2xs w-fit">
          Volver a la ejecución
        </Link>
      </div>

      {!esAsesor && !propia && (
        <div className="p-4 rounded-xl border bg-slate-100 border-slate-300 text-slate-600 text-xs font-bold">
          Esta actividad está a cargo de {responsable?.nombre ?? "otro integrante"}. Puede consultarla, pero solo su responsable la registra.
        </div>
      )}
      {vieneDe && (
        <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-xs font-bold">
          Esta actividad estaba planificada hasta el período {vieneDe.desde} y llegó al {vieneDe.avance}% de avance. Registre en este período lo que se ejecutó del resto.
        </div>
      )}
      {banner && <div className={`p-4 rounded-xl border text-xs font-bold ${banner.className}`}>{banner.title}</div>}
      {registro?.comentarioAsesor && (
        <div className={`p-4 bg-white border-2 rounded-xl space-y-1.5 ${estado === "observado" ? "border-amber-300" : "border-slate-200"}`}>
          <h3 className={`text-xs font-extrabold uppercase tracking-wide ${estado === "observado" ? "text-amber-900" : "text-slate-700"}`}>
            {estado === "observado" ? "Correcciones solicitadas por su asesor designado" : "Comentarios de su asesor designado"}
          </h3>
          <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{registro.comentarioAsesor}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">
          {error}
          {problemas.length > 0 && <ul className="list-disc pl-5 mt-1 font-semibold">{problemas.map((x) => <li key={x}>{x}</li>)}</ul>}
        </div>
      )}
      {okMsg && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">{okMsg}</div>}

      <div className={tarjeta}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Datos de la actividad (plan de trabajo)</h2>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>{info.label}</span>
        </div>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">
          <span className="font-mono text-unicaes">{nodo.codigo}</span> {nodo.titulo || "Sin título"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="sm:col-span-2">
            <span className="block text-slate-400 font-bold uppercase text-[10px]">Ubicación en el plan</span>
            <span className="font-medium text-slate-700">{rutaEnPlan(arbol, nodoId).slice(0, -1).map((n) => `${n.codigo} ${n.titulo}`).join(" › ")}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[10px]">Período</span>
            <span className="font-bold text-slate-800">Período {periodo} · {fechaLarga(p?.desde ?? null)} al {fechaLarga(p?.hasta ?? null)}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-bold uppercase text-[10px]">Responsable</span>
            <span className="font-bold text-slate-800">{responsable?.nombre ?? "—"}</span>
          </div>
          {montoPeriodo > 0 && plan.etapa.presupuesto.activo && (
            <div>
              <span className="block text-slate-400 font-bold uppercase text-[10px]">Presupuesto planificado en el período</span>
              <span className="font-bold text-slate-800">${montoPeriodo.toLocaleString("es-SV")} {plan.etapa.presupuesto.moneda}</span>
            </div>
          )}
        </div>
      </div>

      {reglas.avance && nodo.nivel === 5 && (
        <div className={tarjeta}>
          <div className="border-b border-slate-100 pb-2">
            <h2 className={tituloTarjeta}>¿Se terminó la subactividad?</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              El avance de la actividad lo calcula el sistema: es el porcentaje de sus subactividades terminadas. Si no se termina en el período, pasa al siguiente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Estado de ${nodo.codigo}`}>
            {[{ v: "100", label: "Terminada" }, { v: "0", label: "Sin terminar" }].map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={avance === o.v} disabled={!editable} onClick={() => setAvance(o.v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors disabled:opacity-60 ${avance === o.v ? "bg-unicaes text-white border-unicaes" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {reglas.avance && nodo.nivel !== 5 && (
        <div className={tarjeta}>
          <div className="border-b border-slate-100 pb-2">
            <h2 className={tituloTarjeta}>Avance de la actividad</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Porcentaje ejecutado al cierre del período. Se acumula en el objetivo y en el proyecto.</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <input type="number" min={0} max={100} value={avance} disabled={!editable} onChange={(e) => setAvance(e.target.value)} aria-label={`Avance de ${nodo.codigo}`}
                className="w-24 bg-white border border-border rounded-lg px-3 py-2 text-xs font-bold text-right focus:ring-1 focus:ring-unicaes outline-none disabled:bg-slate-100 disabled:text-slate-500" />
              %
            </label>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(avance) || 0))}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Acciones realizadas</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Describa cómo se ejecutó la actividad: fechas, inversiones realizadas y acciones, en tiempo pasado ({textoRango(reglas.acciones)}).
          </p>
        </div>
        <TextoRedaccion id="acciones" valor={acciones} onChange={setAcciones} deshabilitado={!editable} filas={10}
          placeholder="La actividad fue ejecutada del dd/mm al dd/mm; se realizaron las siguientes acciones..." {...rango(reglas.acciones)} />
      </div>

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Resultado obtenido</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Indique qué se obtuvo y cómo contribuye a la macroactividad y al objetivo ({textoRango(reglas.resultado)}).
          </p>
        </div>
        <TextoRedaccion id="resultado" valor={resultado} onChange={setResultado} deshabilitado={!editable} filas={4}
          placeholder="El resultado obtenido fue..., que contribuye directamente a..." {...rango(reglas.resultado)} />
      </div>

      {reglas.marcoTeorico !== "no" && (
        <div className={tarjeta}>
          <div className="border-b border-slate-100 pb-2">
            <h2 className={tituloTarjeta}>Marco teórico {reglas.marcoTeorico === "opcional" && <span className="normal-case font-semibold text-slate-400">(opcional)</span>}</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {reglas.marcoTeorico === "opcional" ? "Úselo solo si hace falta contextualizar técnicamente la actividad." : "Fundamente teóricamente la actividad realizada."}
            </p>
          </div>
          <TextoRedaccion id="marco" valor={marco} onChange={setMarco} deshabilitado={!editable} filas={4} placeholder="Fundamento teórico que contextualiza la actividad." />
        </div>
      )}

      {limiteEvidencias.max > 0 && (
        <div className={tarjeta}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h2 className={tituloTarjeta}>Evidencias de la actividad</h2>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Imágenes, documentos o enlaces que demuestran el resultado. Aparecen numeradas en el informe del período.
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 whitespace-nowrap">
              {evidencias.length} de {limiteEvidencias.max}{limiteEvidencias.min > 0 ? ` · mínimo ${limiteEvidencias.min}` : ""}
            </span>
          </div>
          <EvidenciasActividad propuestaId={plan.propuesta.id} nodoId={nodoId} periodo={periodo} evidencias={evidencias} limite={limiteEvidencias} editable={editable} />
        </div>
      )}

      {editable && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button type="button" onClick={() => guardar("borrador")} disabled={saving !== null}
              className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors disabled:opacity-50">
              {saving === "borrador" ? "Guardando..." : "Guardar borrador"}
            </button>
            {siguiente && (
              <button type="button" onClick={() => guardar("siguiente")} disabled={saving !== null}
                className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors disabled:opacity-50">
                {saving === "siguiente" ? "Guardando..." : `Guardar y siguiente actividad (${siguiente.codigo})`}
              </button>
            )}
            <button type="button" disabled={saving !== null || pendientes.length > 0}
              onClick={() => { if (window.confirm("¿Enviar esta actividad a su asesor designado? Mientras la revisa no podrá modificarla.")) guardar("enviar"); }}
              className="px-6 py-3 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50">
              {saving === "enviar" ? "Enviando..." : "Enviar actividad al asesor"}
            </button>
          </div>
          {pendientes.length > 0 && <p className="text-right text-[11px] text-slate-500 font-semibold">Para enviar: {pendientes.join(" ")}</p>}
        </>
      )}

      {esAsesor && estado === "enviado" && (
        <div className={tarjeta}>
          <div className="border-b border-slate-100 pb-2">
            <h2 className={tituloTarjeta}>Revisión del asesor</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Apruebe la actividad o solicite correcciones al integrante responsable.</p>
          </div>
          <textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} aria-label="Observaciones para el integrante"
            placeholder="Observaciones para el integrante (obligatorias si solicita correcciones)"
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none" />
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button type="button" disabled={saving !== null} onClick={() => revisar("observar")}
              className="px-5 py-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-extrabold text-xs disabled:opacity-50">
              Solicitar correcciones
            </button>
            <button type="button" disabled={saving !== null} onClick={() => revisar("aprobar")}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50">
              Aprobar actividad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
