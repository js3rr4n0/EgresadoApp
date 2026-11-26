"use client";

// Acciones de la página de detalle de una empresa (entrega V2): habilitar o deshabilitar con motivo, registrar un
// reporte en contra y archivar un reporte.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DialogoEstadoEmpresa, { type ReporteParaDialogo } from "@/components/admin/DialogoEstadoEmpresa";
import { archivarReporteEmpresa, registrarReporteEmpresa } from "@/app/actions/estadoEmpresa";
import {
  MINIMO_DESCRIPCION,
  MINIMO_MOTIVO,
  NOMBRE_ORIGEN,
  ORIGENES_REPORTE,
  TAMANO_MAXIMO_REPORTE,
} from "@/lib/bitacoraEmpresa";

const claseCampo = "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none";

export function BotonEstadoEmpresa({
  empresa,
  reportes,
  notas,
}: {
  empresa: { id: number; nombre: string; habilitada: boolean };
  reportes: ReporteParaDialogo[];
  notas: { egresados: number | null; asesores: number | null; general: number | null } | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${
          empresa.habilitada
            ? "border-border bg-white text-gray-700 hover:border-brand-red hover:text-brand-red"
            : "border-green-300 bg-white text-green-700 hover:bg-green-50"
        }`}
      >
        {empresa.habilitada ? "Deshabilitar" : "Habilitar"}
      </button>
      {abierto && (
        <DialogoEstadoEmpresa empresa={empresa} reportes={reportes} notas={notas} onCerrar={() => setAbierto(false)} onHecho={() => router.refresh()} />
      )}
    </>
  );
}

export function FormularioReporte({
  empresaId,
  procesos,
  hoy,
}: {
  empresaId: number;
  procesos: { id: number; etiqueta: string }[];
  hoy: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const archivo = datos.get("archivo");
    if (archivo instanceof File && archivo.size > TAMANO_MAXIMO_REPORTE) {
      setError("El archivo excede el tamaño máximo de 5 MB.");
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await registrarReporteEmpresa(empresaId, datos);
    setGuardando(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    formRef.current?.reset();
    setAbierto(false);
    setAviso("Reporte registrado. Quedó en la bitácora de la empresa.");
    router.refresh();
  };

  if (!abierto) {
    return (
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted">{aviso ?? "Registra hechos en contra de la empresa para tenerlos en cuenta al decidir si sigue habilitada."}</p>
        <button
          type="button"
          onClick={() => { setAbierto(true); setAviso(null); }}
          className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors"
        >
          Registrar reporte
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={enviar} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Fecha del hecho *</label>
          <input type="date" name="fecha" required max={hoy} defaultValue={hoy} className={claseCampo} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Quién reporta *</label>
          <select name="origen" required defaultValue="" className={claseCampo}>
            <option value="" disabled>Selecciona</option>
            {ORIGENES_REPORTE.map((o) => <option key={o} value={o}>{NOMBRE_ORIGEN[o]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Proceso relacionado</label>
          <select name="propuestaId" defaultValue="" className={claseCampo}>
            <option value="">Ninguno</option>
            {procesos.map((p) => <option key={p.id} value={p.id}>{p.etiqueta}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Descripción de lo sucedido *</label>
        <textarea name="descripcion" required minLength={MINIMO_DESCRIPCION} rows={4} className={claseCampo} placeholder="Qué pasó, a quién afectó y cómo se supo..." />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Evidencia (opcional: PDF, PNG o JPG, hasta 5 MB)</label>
        <input
          type="file"
          name="archivo"
          accept="application/pdf,image/png,image/jpeg"
          className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-red/10 file:text-brand-red hover:file:bg-brand-red/20"
        />
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setAbierto(false)} disabled={guardando} className="px-5 py-2 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="px-5 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar reporte"}
        </button>
      </div>
    </form>
  );
}

export function BotonArchivarReporte({ reporteId }: { reporteId: number }) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const faltan = Math.max(0, MINIMO_MOTIVO - nota.trim().length);

  const archivar = async () => {
    setGuardando(true);
    setError(null);
    const res = await archivarReporteEmpresa(reporteId, nota);
    setGuardando(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setAbierto(false);
    router.refresh();
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-xs font-bold text-gray-500 hover:text-brand-red transition-colors">
        Archivar
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-border bg-gray-50 p-3 space-y-2">
      <label className="block text-xs font-bold text-gray-700">Por qué se archiva *</label>
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={claseCampo} placeholder="Ej. La empresa atendió el caso y corrigió la situación..." />
      <p className="text-xs text-muted">{faltan > 0 ? `Faltan ${faltan} caracteres.` : "Un reporte archivado ya no cuenta como alerta, pero sigue en el historial."}</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setAbierto(false)} disabled={guardando} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-200">Cancelar</button>
        <button type="button" onClick={archivar} disabled={guardando || faltan > 0} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gray-700 hover:bg-gray-800 disabled:opacity-50">
          {guardando ? "Guardando..." : "Archivar reporte"}
        </button>
      </div>
    </div>
  );
}
