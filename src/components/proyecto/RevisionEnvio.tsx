"use client";
// Paso final «Revisión y envío» (R6): lo que falta para enviar, los documentos de soporte de cada integrante, el
// documento completo y la confirmación del líder. Sin confirmación (o si la propuesta cambió después) no se envía.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enviarPropuesta } from "@/app/actions/propuestas";
import { confirmarRevision } from "@/app/actions/revisionPropuesta";
import { fechaCortaSV, horaSV } from "@/lib/fechasTexto";
import type { DocumentosIntegrante, EstadoRevision } from "@/lib/revisionPropuestaServidor";
import TablaDocumentosEquipo from "./TablaDocumentosEquipo";

export default function RevisionEnvio({
  propuestaId,
  pendientes,
  equipo,
  revision,
  esLider,
  bloqueada,
  pasoAnterior,
}: {
  propuestaId: number;
  /** Lo que falta para enviar, sin contar la confirmación. */
  pendientes: string[];
  equipo: DocumentosIntegrante[];
  revision: EstadoRevision;
  esLider: boolean;
  bloqueada: boolean;
  pasoAnterior: number;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlDocumento = `/egresado/redactar/imprimir?id=${propuestaId}`;
  // Se actualiza al momento; el servidor la vuelve a calcular al recargar
  const [confirmada, setConfirmada] = useState(revision.confirmada);
  const puedeEnviar = confirmada && pendientes.length === 0 && esLider && !bloqueada;

  const alternar = async (valor: boolean) => {
    setGuardando(true);
    setError(null);
    const r = await confirmarRevision(propuestaId, valor);
    if (!r.success) setError(r.error ?? "No se pudo guardar la confirmación.");
    else setConfirmada(valor);
    router.refresh();
    setGuardando(false);
  };

  const enviar = async () => {
    if (!confirm("¿Enviar la propuesta? Una vez enviada, no podrás editarla hasta que sea revisada.")) return;
    setEnviando(true);
    setError(null);
    const r = await enviarPropuesta(propuestaId);
    if (r.success) {
      router.push("/egresado");
      router.refresh();
    } else {
      setError(r.error ?? "No se pudo enviar la propuesta.");
      setEnviando(false);
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm space-y-8">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">Revisión y envío</h2>
        <p className="text-sm text-muted mt-1">
          Revisa el documento completo tal como lo recibirá la universidad. Para enviar, confirma que lo revisaste; si cambias algo después,
          tendrás que confirmarlo de nuevo.
        </p>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">{error}</div>}

      {/* Lo que falta */}
      <section>
        <h3 className="font-bold text-card-dark mb-2">Antes de enviar</h3>
        {pendientes.length === 0 ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            Todo lo necesario está completo.
          </p>
        ) : (
          <ul className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-1.5 list-disc pl-8">
            {pendientes.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        )}
      </section>

      {/* Documentos por integrante */}
      <section>
        <h3 className="font-bold text-card-dark mb-1">Documentos de soporte por integrante</h3>
        <p className="text-xs text-muted mb-2">Cada integrante sube los suyos desde su panel principal.</p>
        <TablaDocumentosEquipo equipo={equipo} />
      </section>

      {/* Documento completo */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-bold text-card-dark">Documento completo</h3>
          <a href={urlDocumento} target="_blank" rel="noopener" className="text-xs font-bold text-brand-red hover:underline">
            Abrir en otra pestaña
          </a>
        </div>
        <iframe src={`${urlDocumento}&embebido=1`} title="Documento completo de la propuesta" className="w-full h-[70vh] rounded-lg border border-border bg-gray-50" />
      </section>

      {/* Confirmación y envío */}
      <section className="rounded-xl border border-border bg-gray-50 p-5 space-y-4">
        {revision.cambioDespues && !confirmada && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            La propuesta cambió después de tu última confirmación{revision.confirmadaEn ? ` (${fechaCortaSV(revision.confirmadaEn)}, ${horaSV(revision.confirmadaEn)})` : ""}.
            Revisa el documento otra vez y confirma de nuevo.
          </p>
        )}
        <label className={`flex items-start gap-3 ${esLider && !bloqueada ? "cursor-pointer" : "cursor-not-allowed opacity-75"}`}>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-red"
            checked={confirmada}
            disabled={!esLider || bloqueada || guardando}
            onChange={(e) => alternar(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-bold text-card-dark">Revisé el documento y confirmo que está listo</span>
            {confirmada && revision.confirmada && revision.confirmadaEn && (
              <span className="block text-xs text-muted">Confirmado el {fechaCortaSV(revision.confirmadaEn)} a las {horaSV(revision.confirmadaEn)}</span>
            )}
            {!esLider && <span className="block text-xs text-muted">Lo confirma el líder del equipo.</span>}
          </span>
        </label>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
          <button type="button" onClick={() => router.push(`?id=${propuestaId}&step=${pasoAnterior}`)} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark">
            ← Paso anterior
          </button>
          {esLider && (
            <button
              type="button"
              onClick={enviar}
              disabled={!puedeEnviar || enviando}
              title={!confirmada ? "Primero confirma que revisaste el documento" : pendientes.length ? "Completa lo que falta antes de enviar" : undefined}
              className="px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? "Enviando..." : "Enviar propuesta"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
