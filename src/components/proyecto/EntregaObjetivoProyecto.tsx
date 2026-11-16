"use client";

// Entrega de los productos de un objetivo específico (notas del 13-nov-2026), con el mismo diseño que el registro de
// actividad. Se habilita cuando todas las actividades del objetivo llegan al 100 %: quien lo tiene a cargo adjunta cada
// producto prometido en el plan y escribe la conclusión del objetivo; el asesor revisa todo junto.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DatosEjecucion } from "@/app/actions/ejecucionProyecto";
import { eliminarProductoObjetivo, guardarEntregaObjetivo, revisarEntregaObjetivo, subirProductoObjetivo, type ArchivoProductoCompleto } from "@/app/actions/entregasObjetivo";
import { aplanar, productosDe, responsables } from "@/lib/fichas/planTrabajo";
import { avanceObjetivo, ESTADO_ENTREGA, problemasEntrega, quienesEntregan, revisarConclusionObjetivo, TIPO_CONCLUSION_OBJETIVO } from "@/lib/fichas/entregasObjetivo";
import TextoRedaccion from "@/app/egresado/reportes/actividad/[actividadId]/TextoRedaccion";
import EvidenciasActividad from "./EvidenciasActividad";
import ModificacionCampo from "./ModificacionCampo";
import { enlaceActividad } from "./EjecucionProyecto";

const tarjeta = "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3";
const tituloTarjeta = "text-sm font-extrabold text-slate-900 uppercase tracking-wide";
const NIVEL_ICONO = { ok: "✓", aviso: "!", falta: "✗" } as const;
const NIVEL_CLASE = { ok: "text-emerald-700", aviso: "text-amber-700", falta: "text-red-600" } as const;

export default function EntregaObjetivoProyecto({ datos, objetivoId, archivos }: { datos: DatosEjecucion; objetivoId: string; archivos: ArchivoProductoCompleto[] }) {
  const router = useRouter();
  const { plan, registros } = datos;
  const arbol = plan.plan.arbol;
  const esAsesor = plan.rol === "asesor";
  const objetivo = aplanar(arbol).find((n) => n.id === objetivoId)!;
  const productos = productosDe(objetivo);
  const entrega = datos.entregas.find((e) => e.nodoId === objetivoId) ?? null;
  const avance = avanceObjetivo(objetivo, registros);
  const entregan = quienesEntregan(arbol, objetivoId);
  const propia = entregan.includes(plan.miId);
  const estado = entrega?.estado ?? (avance.completo ? "pendiente" : "bloqueada");
  const editable = !esAsesor && propia && avance.completo && ["pendiente", "borrador", "observado"].includes(estado);
  const nombre = (id: number | null | undefined) => plan.equipo.find((i) => i.id === id)?.nombre ?? "";
  const volver = esAsesor ? `/asesor/ejecucion/${plan.propuesta.id}` : "/egresado/ejecucion";

  const [conclusion, setConclusion] = useState(entrega?.conclusion ?? "");
  const [modTipo, setModTipo] = useState<string | null>(entrega?.modificacionTipo ?? null);
  const [modTexto, setModTexto] = useState(entrega?.modificacion ?? "");
  const [comentario, setComentario] = useState("");
  const [saving, setSaving] = useState<"borrador" | "enviar" | "revisar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problemasServidor, setProblemasServidor] = useState<string[]>([]);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const revisiones = useMemo(() => (conclusion.trim() ? revisarConclusionObjetivo(conclusion) : []), [conclusion]);
  const pendientes = problemasEntrega({ completo: avance.completo, productos, archivos: entrega?.archivos ?? [], conclusion });

  // Actividades del objetivo con su último registro (para revisar las evidencias que respaldan los productos).
  const resp = responsables(arbol);
  const actividades = aplanar(objetivo).filter((n) => n.hijos.length === 0 && n.nivel >= 4).map((a) => {
    const r = registros.filter((x) => x.nodoId === a.id && x.estado !== "borrador").sort((x, y) => y.periodo - x.periodo)[0];
    return { a, r };
  });

  async function guardar(enviar: boolean) {
    setError(null);
    setOkMsg(null);
    setProblemasServidor([]);
    setSaving(enviar ? "enviar" : "borrador");
    const res = await guardarEntregaObjetivo(plan.propuesta.id, objetivoId, conclusion, enviar, { tipo: modTipo, texto: modTexto });
    setSaving(null);
    if (!res.success) {
      setError(res.error);
      setProblemasServidor(res.problemas ?? []);
      return;
    }
    if (enviar) router.push(volver);
    else {
      setOkMsg("Borrador guardado correctamente.");
      router.refresh();
    }
  }

  async function revisar(decision: "aprobar" | "observar") {
    setError(null);
    setSaving("revisar");
    const res = await revisarEntregaObjetivo(plan.propuesta.id, objetivoId, decision, comentario);
    setSaving(null);
    if (!res.success) return setError(res.error);
    router.push(volver);
  }

  const info = ESTADO_ENTREGA[estado] ?? ESTADO_ENTREGA.bloqueada;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{esAsesor ? "Revisión de productos del objetivo" : "Productos del objetivo"}</h1>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            Objetivo específico {objetivo.codigo}{entregan.length ? ` · a cargo de ${entregan.map(nombre).join(", ")}` : ""}
          </p>
        </div>
        <Link href={volver} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs transition-colors shadow-2xs w-fit">
          Volver a la ejecución
        </Link>
      </div>

      {!esAsesor && !propia && (
        <div className="p-4 rounded-xl border bg-slate-100 border-slate-300 text-slate-600 text-xs font-bold">
          Este objetivo está a cargo de {entregan.map(nombre).join(", ") || "otro integrante"}. Puede consultarlo, pero solo quien lo tiene a cargo entrega sus productos.
        </div>
      )}
      {!avance.completo && (
        <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 text-xs font-bold">
          La entrega se habilita cuando todas las actividades del objetivo llegan al 100 %: van {avance.alCien} de {avance.actividades}.
        </div>
      )}
      {estado === "enviado" && (
        <div className="p-4 rounded-xl border text-xs font-bold bg-blue-50 border-blue-200 text-blue-900">
          {esAsesor ? "El equipo envió los productos y la conclusión del objetivo; esperan su revisión." : "Los productos fueron enviados y están en revisión por el asesor designado."}
        </div>
      )}
      {estado === "aprobado" && <div className="p-4 rounded-xl border text-xs font-bold bg-emerald-50 border-emerald-200 text-emerald-900">Los productos y la conclusión del objetivo fueron aprobados por el asesor designado.</div>}
      {entrega?.comentarioAsesor && (
        <div className={`p-4 bg-white border-2 rounded-xl space-y-1.5 ${estado === "observado" ? "border-amber-300" : "border-slate-200"}`}>
          <h3 className={`text-xs font-extrabold uppercase tracking-wide ${estado === "observado" ? "text-amber-900" : "text-slate-700"}`}>
            {estado === "observado" ? "Correcciones solicitadas por su asesor designado" : "Comentarios de su asesor designado"}
          </h3>
          <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{entrega.comentarioAsesor}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">
          {error}
          {problemasServidor.length > 0 && <ul className="list-disc pl-5 mt-1 font-semibold">{problemasServidor.map((x) => <li key={x}>{x}</li>)}</ul>}
        </div>
      )}
      {okMsg && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">{okMsg}</div>}

      <div className={tarjeta}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Objetivo específico (plan de trabajo)</h2>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>{info.label}</span>
        </div>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">
          <span className="font-mono text-unicaes">{objetivo.codigo}</span> {objetivo.titulo || "Sin título"}
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>Actividades al 100 %</span>
            <span>{avance.alCien} de {avance.actividades}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${avance.actividades ? Math.round((avance.alCien / avance.actividades) * 100) : 0}%` }} />
          </div>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer w-fit font-bold text-slate-600 hover:text-slate-900 select-none">Actividades del objetivo y sus evidencias</summary>
          <ul className="mt-2 divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {actividades.map(({ a, r }) => (
              <li key={a.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="font-mono text-[11px] text-slate-500 w-20 shrink-0">{a.codigo}</span>
                <span className="flex-1 font-semibold text-slate-800">{a.titulo}{plan.equipo.length > 1 ? <span className="text-slate-400 font-medium"> · {nombre(resp.get(a.id))}</span> : null}</span>
                <span className={`text-[11px] font-bold ${r?.avance === 100 ? "text-emerald-700" : "text-slate-500"}`}>{r ? `${r.avance ?? 0}%` : "Sin registro"}</span>
                <span className="text-[11px] text-slate-500 font-semibold">{r ? `${r.evidencias.length} evidencia(s)` : ""}</span>
                {r && <Link href={enlaceActividad(datos, a.id, r.periodo)} className="text-[11px] font-bold text-unicaes hover:underline">Ver</Link>}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {productos.map((p, i) => {
        const suyos = archivos.filter((a) => a.producto === i);
        return (
          <div key={i} className={tarjeta}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div>
                <h2 className={tituloTarjeta}>Producto {i + 1}: {p}</h2>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Es lo que se prometió en el plan de trabajo para este objetivo. Adjunte el documento, la imagen o el enlace que lo contiene.</p>
              </div>
              <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap border ${suyos.length ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-slate-600 bg-slate-50 border-slate-200"}`}>
                {suyos.length ? `${suyos.length} adjunto(s)` : "Sin adjuntar"}
              </span>
            </div>
            <EvidenciasActividad propuestaId={plan.propuesta.id} nodoId={objetivoId} periodo={datos.periodoActual} evidencias={suyos} limite={{ min: 1, max: 5 }}
              editable={editable} idBase={`producto-${i}`} nombre="Archivo"
              subir={(fd) => subirProductoObjetivo(plan.propuesta.id, objetivoId, i, fd)}
              quitar={(id) => eliminarProductoObjetivo(plan.propuesta.id, objetivoId, id)} />
          </div>
        );
      })}
      {productos.length === 0 && (
        <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 text-xs font-bold">
          El plan no declara productos para este objetivo; basta con la conclusión.
        </div>
      )}

      <div className={tarjeta}>
        <div className="border-b border-slate-100 pb-2">
          <h2 className={tituloTarjeta}>Conclusión del objetivo</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {TIPO_CONCLUSION_OBJETIVO.partes[0].ayuda} Pasa al capítulo de conclusiones del informe final.
          </p>
        </div>
        <TextoRedaccion id="conclusion-objetivo" valor={conclusion} onChange={setConclusion} deshabilitado={!editable} filas={6}
          placeholder={TIPO_CONCLUSION_OBJETIVO.ejemplo} minimo={TIPO_CONCLUSION_OBJETIVO.partes[0].min} maximo={TIPO_CONCLUSION_OBJETIVO.partes[0].max} />
        {revisiones.length > 0 && (
          <ul className="space-y-1 text-[11px] font-semibold" aria-label="Revisión de la conclusión">
            {revisiones.map((r) => (
              <li key={r.id} className={`flex gap-2 ${NIVEL_CLASE[r.nivel]}`}><span aria-hidden>{NIVEL_ICONO[r.nivel]}</span>{r.mensaje}</li>
            ))}
          </ul>
        )}
      </div>

      {datos.modificaciones && (
        <ModificacionCampo idBase="objetivo" tipo={modTipo} texto={modTexto} onTipo={setModTipo} onTexto={setModTexto} editable={editable} de="el objetivo" />
      )}

      {editable && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button type="button" onClick={() => guardar(false)} disabled={saving !== null}
              className="px-5 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors disabled:opacity-50">
              {saving === "borrador" ? "Guardando..." : "Guardar borrador"}
            </button>
            <button type="button" disabled={saving !== null || pendientes.length > 0}
              onClick={() => { if (window.confirm("¿Enviar los productos y la conclusión del objetivo a su asesor designado? Mientras los revisa no podrá modificarlos.")) guardar(true); }}
              className="px-6 py-3 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50">
              {saving === "enviar" ? "Enviando..." : "Enviar productos al asesor"}
            </button>
          </div>
          {pendientes.length > 0 && <p className="text-right text-[11px] text-slate-500 font-semibold">Para enviar: {pendientes.join(" ")}</p>}
        </>
      )}

      {esAsesor && estado === "enviado" && (
        <div className={tarjeta}>
          <div className="border-b border-slate-100 pb-2">
            <h2 className={tituloTarjeta}>Revisión del asesor</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Revise que cada producto prometido esté y que la conclusión responda al objetivo. Apruebe o solicite correcciones.</p>
          </div>
          <textarea rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} aria-label="Observaciones para el integrante"
            placeholder="Observaciones (obligatorias si solicita correcciones)"
            className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none" />
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button type="button" disabled={saving !== null} onClick={() => revisar("observar")}
              className="px-5 py-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-extrabold text-xs disabled:opacity-50">
              Solicitar correcciones
            </button>
            <button type="button" disabled={saving !== null} onClick={() => revisar("aprobar")}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50">
              Aprobar productos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
