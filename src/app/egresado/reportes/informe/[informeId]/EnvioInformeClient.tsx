"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enviarInformeMensual, type RequisitoInforme } from "@/app/actions/informesMensuales";
import { formatearFechaLarga } from "@/lib/periodosPasantia";

interface InformeResumen {
  id: number;
  numero: number;
  estado: string;
  fechaLimite: string;
  enviadoEn: string | null;
  cumplimiento: string | null;
  comentarioAsesor: string | null;
}

const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  redactando: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Enviado, en revisión", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

function formatFechaHora(texto: string | null) {
  return texto || "—";
}

export default function EnvioInformeClient({
  informe,
  periodo,
  requisitos: requisitosIniciales,
  advertencias,
  paginasEstimadas,
  puedeEnviar,
}: {
  informe: InformeResumen;
  periodo: { inicio: string | null; fin: string | null } | null;
  requisitos: RequisitoInforme[];
  advertencias: string[];
  paginasEstimadas: number;
  puedeEnviar: boolean;
}) {
  const router = useRouter();
  const [requisitos, setRequisitos] = useState(requisitosIniciales);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estado = ESTADO_INFORME[informe.estado] || ESTADO_INFORME.redactando;
  const estadoPermiteEnvio = informe.estado === "redactando" || informe.estado === "observado";
  const pendientes = requisitos.filter((r) => !r.cumplido).length;

  const handleEnviar = async () => {
    setError(null);
    setEnviando(true);
    const res = await enviarInformeMensual(informe.id);
    setEnviando(false);
    setConfirmando(false);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "No se pudo enviar el informe.");
      if ("requisitos" in res && res.requisitos) setRequisitos(res.requisitos);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Informe #{informe.numero}</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Pasantía como Trabajo de Graduación</p>
        </div>
        <Link
          href="/egresado/reportes"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al seguimiento
        </Link>
      </div>

      {informe.estado === "enviado" && (
        <div className="p-4 rounded-xl border bg-blue-50 border-blue-200 text-blue-900 text-xs font-semibold">
          El informe fue enviado el {formatFechaHora(informe.enviadoEn)} y se encuentra en revisión por su asesor designado.
        </div>
      )}
      {informe.estado === "observado" && (
        <div className="p-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold space-y-1">
          <p className="font-extrabold">Su asesor designado solicitó correcciones.</p>
          {informe.comentarioAsesor && <p className="whitespace-pre-wrap font-medium">{informe.comentarioAsesor}</p>}
          <p className="font-medium">Corrija las actividades señaladas y vuelva a enviar el informe.</p>
        </div>
      )}
      {informe.estado === "aprobado" && (
        <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs font-semibold space-y-1">
          <p className="font-extrabold">El informe fue aprobado por su asesor designado.</p>
          {informe.comentarioAsesor && <p className="whitespace-pre-wrap font-medium">{informe.comentarioAsesor}</p>}
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Estado</span>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${estado.badge}`}>
              {estado.label}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Período del informe</span>
            <span className="font-bold text-slate-800">
              {periodo?.inicio ? `${formatearFechaLarga(periodo.inicio)} al ${formatearFechaLarga(periodo.fin)}` : "—"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Fecha límite de entrega</span>
            <span className="font-bold text-slate-800">{formatearFechaLarga(informe.fechaLimite)}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Extensión estimada</span>
            <span className="font-bold text-slate-800">{paginasEstimadas} páginas</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Envío</span>
            <span className="font-bold text-slate-800">{formatFechaHora(informe.enviadoEn)}</span>
            {informe.cumplimiento && (
              <span className="block text-[11px] text-slate-500 font-semibold">
                {informe.cumplimiento === "a_tiempo" ? "A tiempo" : "Fuera de tiempo"}
              </span>
            )}
          </div>
        </div>
      </div>

      {advertencias.length > 0 && (
        <div className="p-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold space-y-1">
          <p className="font-extrabold">Advertencia de extensión del informe</p>
          {advertencias.map((a, i) => (
            <p key={i} className="font-medium">
              {a}
            </p>
          ))}
          <p className="font-medium">Esta advertencia no impide el envío.</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Requisitos para el envío</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            {pendientes === 0
              ? "Todos los apartados obligatorios están completos."
              : `${pendientes} apartado${pendientes > 1 ? "s" : ""} pendiente${pendientes > 1 ? "s" : ""} de completar.`}
          </p>
        </div>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {requisitos.map((r) => (
            <li key={r.id} className="p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-slate-800">{r.titulo}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                    r.cumplido ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  {r.cumplido ? "Completo" : "Pendiente"}
                </span>
              </div>
              {r.detalles.length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5">
                  {r.detalles.map((d, i) => (
                    <li key={i} className="text-[11px] text-slate-600 font-medium">
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end items-stretch sm:items-center">
        <Link
          href={`/informes/${informe.id}/imprimir`}
          target="_blank"
          className="text-center px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-extrabold text-xs"
        >
          Ver documento del informe
        </Link>
        {estadoPermiteEnvio && (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={!puedeEnviar || pendientes > 0}
            className="px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enviar informe
          </button>
        )}
      </div>
      {estadoPermiteEnvio && (!puedeEnviar || pendientes > 0) && (
        <p className="text-right text-[11px] text-slate-500 font-semibold">
          Complete los apartados marcados como pendientes para habilitar el envío.
        </p>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Confirmar envío del Informe #{informe.numero}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Una vez enviado, el informe quedará en revisión por su asesor designado y no podrá modificar las actividades de este mes
              salvo que el asesor solicite correcciones. La fecha y hora de envío quedarán registradas.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmando(false)}
                disabled={enviando}
                className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviar}
                disabled={enviando}
                className="px-5 py-2 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white text-xs font-extrabold disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Confirmar envío"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
