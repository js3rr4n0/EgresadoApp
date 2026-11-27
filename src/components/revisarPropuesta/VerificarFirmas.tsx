"use client";
// Verificación de firmas de la carta (A4): la carta a la izquierda y, a la derecha, la empresa y las personas que eligió
// el egresado con la firma registrada en la empresa. La comparación es a simple vista; al terminar se marca «Firmas
// verificadas» o se rechaza la propuesta con el motivo de la firma ya marcado.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PdfToImagesViewer from "@/components/PdfToImagesViewer";
import MediaZoomViewer from "@/components/MediaZoomViewer";
import RechazarPropuesta from "./RechazarPropuesta";
import { marcarFirmasVerificadas } from "@/app/actions/verificacionFirmas";
import { fechaCortaSV, horaSV } from "@/lib/fechasTexto";
import type { PersonaEmpresa } from "@/lib/expedientePropuesta";
import type { EstadoVerificacionFirmas } from "@/lib/verificacionFirmasServidor";

function PersonaFirma({ p, rol }: { p: PersonaEmpresa; rol: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{rol}</p>
        <p className="font-bold text-card-dark">{p.nombre}</p>
        <p className="text-xs text-gray-600">{p.cargo ?? "Sin cargo"}</p>
        <p className="text-xs text-gray-600">{[p.correo, p.telefono].filter(Boolean).join(" · ") || "Sin contacto"}</p>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">Firma registrada en la empresa</p>
        {p.firmaUrl ? (
          <div className="flex justify-center">
            <MediaZoomViewer url={p.firmaUrl} alt={`Firma de ${p.nombre}`} title={`Firma de ${p.nombre}`} isSignature />
          </div>
        ) : (
          <p className="text-sm text-amber-800">Sin firma registrada. Pide a la empresa una muestra o regístrala en Gestión de Empresas.</p>
        )}
      </div>
    </div>
  );
}

export default function VerificarFirmas({
  propuestaId,
  numero,
  empresa,
  cartaUrl,
  firmantes,
  supervisor,
  sinSupervisor,
  estado,
  rechazo,
}: {
  propuestaId: number;
  numero: number;
  empresa: string | null;
  cartaUrl: string;
  firmantes: PersonaEmpresa[];
  supervisor: PersonaEmpresa | null;
  sinSupervisor: boolean;
  estado: EstadoVerificacionFirmas;
  /** Si se puede rechazar en este momento (A2). */
  rechazo: { integrantes: { id: number; nombre: string }[] } | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marcar = async (valor: boolean) => {
    setGuardando(true);
    setError(null);
    const r = await marcarFirmasVerificadas(propuestaId, valor);
    setGuardando(false);
    if (!r.success) return setError(r.error ?? "No se pudo guardar.");
    if (valor) setAbierto(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-brand-red px-3 py-1.5 text-xs font-bold text-brand-red hover:bg-red-50"
        >
          Verificar firmas
        </button>
        {estado.verificada ? (
          <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-800">
            Firmas verificadas{estado.quien ? ` por ${estado.quien}` : ""}{estado.fecha ? ` el ${fechaCortaSV(estado.fecha)}` : ""}
          </span>
        ) : estado.cambioDespues ? (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            La carta cambió después de verificarla
          </span>
        ) : (
          <span className="rounded-full border border-border bg-gray-50 px-2.5 py-0.5 text-xs font-bold text-gray-600">Firmas sin verificar</span>
        )}
      </div>

      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-firmas">
            <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
                <div>
                  <h2 id="titulo-firmas" className="text-lg font-bold text-card-dark">Verificar firmas · Propuesta #{numero}</h2>
                  <p className="text-sm text-muted">
                    Compara las firmas de la carta con las registradas en {empresa ?? "la empresa"}. La comparación es a simple vista.
                  </p>
                </div>
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
                  Cerrar
                </button>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
                <div className="overflow-y-auto border-b border-border bg-gray-50 p-4 lg:border-b-0 lg:border-r">
                  <PdfToImagesViewer url={cartaUrl} title="Carta de aceptación" />
                </div>
                <div className="space-y-3 overflow-y-auto p-4">
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Empresa</p>
                    <p className="font-bold text-card-dark">{empresa ?? "Sin empresa"}</p>
                  </div>
                  {firmantes.map((f) => <PersonaFirma key={f.id} p={f} rol="Firmante elegido por el egresado" />)}
                  {supervisor && <PersonaFirma p={supervisor} rol="Supervisor elegido por el egresado" />}
                  {sinSupervisor && (
                    <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">El egresado indicó que no hay supervisor empresarial.</p>
                  )}
                  {firmantes.length === 0 && !supervisor && !sinSupervisor && (
                    <p className="text-sm text-muted">El egresado no eligió personas de la empresa (propuesta anterior a la selección de firmantes).</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
                <div className="text-xs text-muted">
                  {estado.verificada && estado.fecha
                    ? `Verificadas por ${estado.quien ?? "—"} el ${fechaCortaSV(estado.fecha)} a las ${horaSV(estado.fecha)}`
                    : "Al marcarlas queda registrado quién y cuándo. No bloquea la asignación."}
                  {error && <span className="block font-semibold text-brand-red mt-1">{error}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {rechazo && (
                    <RechazarPropuesta
                      propuestaId={propuestaId}
                      numero={numero}
                      integrantes={rechazo.integrantes}
                      motivosIniciales={[{ clave: "firma" }]}
                      textoBoton="La firma no coincide: rechazar"
                      alRechazar={() => { setAbierto(false); router.refresh(); }}
                      claseBoton="rounded-lg border border-brand-red px-4 py-2 text-sm font-bold text-brand-red hover:bg-red-50"
                    />
                  )}
                  {estado.verificada ? (
                    <button type="button" onClick={() => marcar(false)} disabled={guardando}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      Quitar verificación
                    </button>
                  ) : (
                    <button type="button" onClick={() => marcar(true)} disabled={guardando}
                      className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:bg-brand-red-hover disabled:opacity-50">
                      {guardando ? "Guardando..." : "Firmas verificadas"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
