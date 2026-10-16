"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { aprobarInformeMensual, solicitarCorreccionInformeMensual, type PuntoRubrica } from "@/app/actions/informesMensuales";
import { nombreInforme } from "@/lib/periodosPasantia";
import type { ComentariosDecanato, NotaSemanal } from "@/lib/comentariosAsesor";
import ComentariosAsesorForm from "./ComentariosAsesorForm";
import EncabezadoInforme from "@/components/EncabezadoInforme";
import { verificarCartaFinalizacion } from "@/app/actions/informeFinal";
import { AYUDA_CARTA_FINALIZACION } from "@/lib/informeFinal";

export default function RevisionInformeClient({
  propuestaId,
  informe,
  periodo,
  actividades,
  comentarios,
  comentariosCompletos,
  notasSemanales,
  visita,
  rubrica,
  cartaFinal,
}: {
  propuestaId: number;
  /** Solo en el informe final: carta de finalización satisfactoria que el asesor debe verificar. */
  cartaFinal: { carta: { nombre: string; url: string } | null; verificada: boolean } | null;
  informe: {
    id: number;
    numero: number;
    estado: string;
    fechaLimite: string;
    enviadoEn: string | null;
    cumplimiento: string | null;
    comentarioAsesor: string | null;
  };
  periodo: { inicio: string | null; fin: string | null } | null;
  actividades: { id: number; codigo: string; titulo: string; estado: string }[];
  comentarios: ComentariosDecanato;
  comentariosCompletos: boolean;
  notasSemanales: NotaSemanal[];
  visita: { requerida: boolean; completada: boolean };
  rubrica: PuntoRubrica[];
}) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [confirmarAprobacion, setConfirmarAprobacion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeRevisar = informe.estado === "enviado";
  // La aprobación es acumulativa: el informe se aprueba cuando todas las semanas del período ya fueron aprobadas.
  const sinAprobar = actividades.filter((a) => a.estado !== "aprobado");
  const requisitosAprobacion = [
    ...(sinAprobar.length > 0
      ? [`Apruebe todos los subperíodos del período. Actividades sin aprobar: ${sinAprobar.map((a) => a.codigo).join(", ")}.`]
      : []),
    ...(comentariosCompletos ? [] : ["Complete y guarde los comentarios del asesor para el decanato."]),
    ...(visita.requerida && !visita.completada ? ["Complete el informe de visita a la empresa (requisito del Informe #3)."] : []),
    ...(cartaFinal && !cartaFinal.verificada ? ["Verifique la carta de finalización satisfactoria."] : []),
  ];

  const handleVerificarCarta = async () => {
    setError(null);
    setLoading(true);
    const res = await verificarCartaFinalizacion(informe.id);
    setLoading(false);
    if (res.success) router.refresh();
    else setError(res.error || "No se pudo verificar la carta.");
  };

  const handleAprobar = async () => {
    setError(null);
    setLoading(true);
    const res = await aprobarInformeMensual(informe.id, comentario.trim() || undefined);
    setLoading(false);
    setConfirmarAprobacion(false);
    if (res.success) router.push(`/asesor/seguimiento/${propuestaId}`);
    else setError(res.error || "No se pudo aprobar el informe.");
  };

  const handleCorrecciones = async () => {
    setError(null);
    if (comentario.trim().length < 5) {
      setError("Debe escribir las observaciones para el estudiante antes de solicitar correcciones.");
      return;
    }
    setLoading(true);
    const res = await solicitarCorreccionInformeMensual(informe.id, comentario.trim());
    setLoading(false);
    if (res.success) router.push(`/asesor/seguimiento/${propuestaId}`);
    else setError(res.error || "No se pudieron registrar las observaciones.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Revisión del {nombreInforme(informe.numero).toLowerCase()}</h1>
          <p className="text-xs text-muted mt-1 font-semibold">Pasantía como Trabajo de Graduación</p>
        </div>
        <Link
          href={`/asesor/seguimiento/${propuestaId}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-unicaes hover:bg-unicaes-hover text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}

      <EncabezadoInforme informe={informe} periodo={periodo} />

      {visita.requerida && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            visita.completada ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          <span>
            {visita.completada
              ? "El informe de visita a la empresa está completado."
              : "Este informe requiere el informe de visita a la empresa, con las fotografías de la visita, antes de su aprobación."}
          </span>
          <Link
            href={`/asesor/seguimiento/${propuestaId}/visita`}
            className="px-4 py-2 rounded-lg bg-white border border-current font-bold text-[11px] text-center shrink-0"
          >
            {visita.completada ? "Ver informe de visita" : "Completar informe de visita"}
          </Link>
        </div>
      )}

      {cartaFinal && (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-card-dark">Carta de finalización satisfactoria</h2>
            {cartaFinal.carta && (
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                  cartaFinal.verificada ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-300"
                }`}
              >
                {cartaFinal.verificada ? "Verificada" : "Pendiente de verificar"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted font-semibold">
            {AYUDA_CARTA_FINALIZACION} Verifique que esté firmada por quien emitió la carta de aceptación; de lo contrario, se requiere
            la autorización previa del decanato.
          </p>
          {cartaFinal.carta ? (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cartaFinal.carta.url}
                alt={cartaFinal.carta.nombre}
                className="w-56 h-72 object-contain border border-slate-200 rounded-lg bg-slate-50"
              />
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 break-all">{cartaFinal.carta.nombre}</p>
                {puedeRevisar && !cartaFinal.verificada && (
                  <button
                    type="button"
                    onClick={handleVerificarCarta}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold disabled:opacity-50"
                  >
                    Verificar carta
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-800 font-semibold">El egresado aún no adjunta la carta de finalización.</p>
          )}
        </div>
      )}

      {rubrica.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-card-dark">Lista de verificación de la rúbrica</h2>
              <p className="text-[11px] text-muted font-semibold mt-0.5">
                El sistema valida automáticamente la mayoría de los puntos. Los de criterio provienen de las observaciones estándar que
                usted marcó en la revisión de cada subperíodo.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 bg-slate-50 text-slate-700 border-slate-200">
              {rubrica.filter((p) => p.estado === "cumple").length} de {rubrica.length} cumplen
            </span>
          </div>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {rubrica.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-3 py-2.5">
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    p.estado === "cumple" ? "bg-emerald-600 text-white" : p.estado === "revisar" ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                  aria-hidden="true"
                >
                  {p.estado === "cumple" ? (
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                      <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span className="text-[9px] font-extrabold">{p.estado === "revisar" ? "!" : "–"}</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">
                    {p.titulo}
                    <span className="ml-2 text-[9px] font-extrabold uppercase text-slate-400">{p.automatico ? "Automático" : "Revisión por subperíodo"}</span>
                  </p>
                  <p className={`text-[11px] font-semibold ${p.estado === "revisar" ? "text-amber-800" : "text-slate-500"}`}>{p.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ComentariosAsesorForm
        informeId={informe.id}
        inicial={comentarios}
        editable={informe.estado !== "aprobado"}
        notasSemanales={notasSemanales}
      />

      {puedeRevisar ? (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-extrabold text-card-dark">Dictamen del informe</h2>
            <p className="text-[11px] text-muted font-semibold mt-0.5">
              Las {actividades.length} actividades de este informe ya fueron aprobadas en la revisión de cada subperíodo, por lo que el
              informe no las vuelve a abrir: la aprobación es acumulativa. Revise el documento y la lista de la rúbrica, complete sus
              comentarios para el decanato y apruebe el informe.
              {cartaFinal &&
                " Si los agradecimientos o la carta de finalización requieren cambios, devuelva el informe al estudiante con sus observaciones."}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="comentario-dictamen" className="block text-[10px] font-bold uppercase text-slate-400">
              {cartaFinal ? "Observaciones para el estudiante" : "Comentario para el estudiante (opcional)"}
            </label>
            <textarea
              id="comentario-dictamen"
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={
                cartaFinal
                  ? "Obligatorio si devuelve el informe: indique qué debe corregir en los agradecimientos o en la carta."
                  : "Se muestra al estudiante junto con la aprobación."
              }
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-100">
            {cartaFinal && (
              <button
                type="button"
                disabled={loading}
                onClick={handleCorrecciones}
                className="px-5 py-3 rounded-xl border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-extrabold text-xs disabled:opacity-50"
              >
                Devolver con observaciones
              </button>
            )}
            <button
              type="button"
              disabled={loading || requisitosAprobacion.length > 0}
              title={requisitosAprobacion.join(" ")}
              onClick={() => setConfirmarAprobacion(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md disabled:opacity-50"
            >
              Aprobar informe
            </button>
          </div>
          {requisitosAprobacion.length > 0 && (
            <ul className="text-right text-[11px] text-amber-800 font-semibold space-y-0.5">
              {requisitosAprobacion.map((r) => (
                <li key={r}>Para aprobar: {r}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted font-semibold">
          {informe.estado === "redactando"
            ? "El estudiante aún no ha enviado este informe."
            : informe.estado === "observado"
              ? "Se solicitaron correcciones; el informe volverá a estar disponible para revisión cuando el estudiante lo reenvíe."
              : "Este informe ya fue aprobado."}
        </p>
      )}

      {confirmarAprobacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Aprobar {nombreInforme(informe.numero).toLowerCase()}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El informe quedará registrado como aprobado y se notificará al estudiante y a la coordinación.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmarAprobacion(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobar}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-50"
              >
                {loading ? "Aprobando..." : "Confirmar aprobación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
