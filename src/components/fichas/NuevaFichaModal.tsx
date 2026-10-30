"use client";

import { useMemo, useState, useTransition } from "react";
import { crearFicha } from "@/app/actions/fichas";
import { armarCodigo, MODALIDADES_DISENO, nombreAutomatico, raizCodigo, siguienteCorrelativo } from "@/lib/fichas/codigo";
import type { Modalidad } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD, Proximamente } from "./comunes";

interface Origen {
  versionId: number;
  modalidad: Modalidad;
  etiqueta: string;
  esBase: boolean;
}

interface Existente {
  id: number;
  codigo: string | null;
  modalidad: Modalidad;
  facultadId: number | null;
  carreraId: number | null;
}

/**
 * Nueva ficha: se eligen las generalidades y el sistema genera el código y el nombre (src/lib/fichas/codigo.ts).
 * Si ya hay una ficha con las mismas generalidades se avisa, para no crear dos con la misma finalidad.
 */
export default function NuevaFichaModal({
  origenes,
  existentes,
  facultades,
  carreras,
}: {
  origenes: Origen[];
  existentes: Existente[];
  facultades: { id: number; nombre: string; codigo: string | null }[];
  carreras: { id: number; nombre: string; codigo: string | null; facultadId: number }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [modalidad, setModalidad] = useState<Modalidad>("pasantia");
  const [origen, setOrigen] = useState<string>("");
  const [facultadId, setFacultadId] = useState<string>("");
  const [carreraId, setCarreraId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const origenesModalidad = useMemo(() => origenes.filter((o) => o.modalidad === modalidad && !o.esBase), [origenes, modalidad]);
  const facultad = facultades.find((f) => String(f.id) === facultadId) ?? null;
  const carrera = carreras.find((c) => String(c.id) === carreraId) ?? null;
  const raiz = raizCodigo(modalidad, facultad?.codigo ?? null);
  const codigo = armarCodigo(raiz, siguienteCorrelativo(raiz, existentes.map((e) => e.codigo)), carrera?.codigo ?? null);
  const nombre = nombreAutomatico(modalidad, facultad?.nombre ?? null, carrera?.nombre ?? null);
  const repetidas = existentes.filter(
    (e) => e.modalidad === modalidad && e.facultadId === (facultad?.id ?? null) && e.carreraId === (carrera?.id ?? null)
  );

  function cerrar() {
    setAbierto(false);
    setError(null);
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const res = await crearFicha({
        modalidad,
        facultadId: facultad?.id ?? null,
        carreraId: carrera?.id ?? null,
        partirDeVersionId: origen ? Number(origen) : null,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      // Carga completa: la ruta del editor puede no estar compilada todavía en desarrollo y router.push quedaba en espera.
      window.location.assign(`/admin/bloques-propuestas/${res.fichaId}`);
    });
  }

  const campo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red disabled:bg-gray-50";
  const etiqueta = "block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="bg-brand-red hover:bg-red-800 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 self-start sm:self-auto whitespace-nowrap shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nueva ficha
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titulo-nueva-ficha">
          <form onSubmit={crear} className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 id="titulo-nueva-ficha" className="text-lg font-bold text-gray-800">Nueva ficha</h2>
                <p className="text-xs text-gray-500">Elige las generalidades; el código y el nombre se generan solos.</p>
              </div>
              <button type="button" onClick={cerrar} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <fieldset>
                <legend className={etiqueta}>1. Modalidad</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODALIDADES_DISENO.map((m) => (
                    <label key={m.clave} title={"nota" in m ? m.nota : undefined}
                      className={`border rounded-lg px-3 py-2 text-sm text-center font-medium ${!m.disponible ? "border-dashed border-gray-200 text-gray-400 cursor-not-allowed" : modalidad === m.clave ? "border-brand-red bg-red-50 text-brand-red cursor-pointer" : "border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"}`}>
                      <input type="radio" name="modalidad" value={m.clave} disabled={!m.disponible} checked={modalidad === m.clave}
                        onChange={() => { setModalidad(m.clave as Modalidad); setOrigen(""); }} className="sr-only" />
                      <span className="block">{m.nombre}</span>
                      <span className="block text-[10px] font-mono">{m.prefijo}</span>
                      {!m.disponible && <span className="block text-[10px]">Próximamente</span>}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nf-facultad" className={etiqueta}>2. Facultad</label>
                  <select id="nf-facultad" className={campo} value={facultadId} onChange={(e) => { setFacultadId(e.target.value); setCarreraId(""); }}>
                    <option value="">Todas las facultades</option>
                    {facultades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="nf-carrera" className={etiqueta}>3. Carrera</label>
                  <select id="nf-carrera" className={campo} value={carreraId} onChange={(e) => setCarreraId(e.target.value)} disabled={!facultadId}>
                    <option value="">Todas las carreras</option>
                    {carreras.filter((c) => String(c.facultadId) === facultadId).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="nf-origen" className={etiqueta}>4. Partir de</label>
                <select id="nf-origen" className={campo} value={origen} onChange={(e) => setOrigen(e.target.value)}>
                  <option value="">Ficha base de {ETIQUETA_MODALIDAD[modalidad].toLowerCase()} (funcionamiento actual)</option>
                  {origenesModalidad.map((o) => <option key={o.versionId} value={o.versionId}>Copia de {o.etiqueta}</option>)}
                </select>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Se creará</div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-mono text-base font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-0.5">{codigo}</span>
                  <span className="text-sm text-gray-700">{nombre}</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 font-mono">
                  {raiz.split("-")[0]} modalidad · {raiz.split("-")[1]} facultad · correlativo{carrera ? " · carrera" : ""}
                </p>
              </div>

              {repetidas.length > 0 && (
                <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Ya existe {repetidas.map((r) => r.codigo).join(", ")} con estas mismas generalidades. Si quieres cambiar sus reglas, abre esa ficha y crea una versión nueva en lugar de otra ficha.
                </div>
              )}

              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <Proximamente texto="Especialización y Mixta: más adelante" />
              <div className="flex gap-2">
                <button type="button" onClick={cerrar} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={pendiente} className="bg-brand-red hover:bg-red-800 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-bold text-sm">
                  {pendiente ? "Creando…" : "Crear borrador"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
