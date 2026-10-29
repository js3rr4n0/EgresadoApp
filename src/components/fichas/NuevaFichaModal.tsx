"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearFicha } from "@/app/actions/fichas";
import type { Modalidad } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD } from "./comunes";

interface Origen {
  versionId: number;
  modalidad: Modalidad;
  etiqueta: string;
  esBase: boolean;
}

export default function NuevaFichaModal({
  origenes,
  facultades,
  carreras,
}: {
  origenes: Origen[];
  facultades: { id: number; nombre: string }[];
  carreras: { id: number; nombre: string; facultadId: number }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("pasantia");
  const [origen, setOrigen] = useState<string>("");
  const [facultadId, setFacultadId] = useState<string>("");
  const [carreraId, setCarreraId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const origenesModalidad = useMemo(() => origenes.filter((o) => o.modalidad === modalidad), [origenes, modalidad]);
  const carrerasFacultad = carreras.filter((c) => String(c.facultadId) === facultadId);

  function cambiarModalidad(m: Modalidad) {
    setModalidad(m);
    setOrigen("");
  }

  function cerrar() {
    setAbierto(false);
    setError(null);
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const res = await crearFicha({
        nombre,
        modalidad,
        facultadId: facultadId ? Number(facultadId) : null,
        carreraId: carreraId ? Number(carreraId) : null,
        partirDeVersionId: origen ? Number(origen) : null,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push(`/admin/bloques-propuestas/${res.fichaId}`);
    });
  }

  const campo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red";
  const etiqueta = "block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5";

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="bg-brand-red hover:bg-red-800 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nueva ficha
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="titulo-nueva-ficha">
          <form onSubmit={crear} className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 id="titulo-nueva-ficha" className="text-lg font-bold text-gray-800">Nueva ficha</h2>
              <button type="button" onClick={cerrar} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="nf-nombre" className={etiqueta}>Nombre</label>
                <input id="nf-nombre" className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Proyecto de desarrollo de software" maxLength={150} required />
              </div>

              <fieldset>
                <legend className={etiqueta}>Modalidad</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(ETIQUETA_MODALIDAD) as Modalidad[]).map((m) => (
                    <label key={m} className={`border rounded-lg px-3 py-2 text-sm text-center cursor-pointer font-medium ${modalidad === m ? "border-brand-red bg-red-50 text-brand-red" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                      <input type="radio" name="modalidad" value={m} checked={modalidad === m} onChange={() => cambiarModalidad(m)} className="sr-only" />
                      {ETIQUETA_MODALIDAD[m]}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="nf-origen" className={etiqueta}>Partir de</label>
                <select id="nf-origen" className={campo} value={origen} onChange={(e) => setOrigen(e.target.value)}>
                  <option value="">Ficha base de {ETIQUETA_MODALIDAD[modalidad].toLowerCase()} (funcionamiento actual)</option>
                  {origenesModalidad.filter((o) => !o.esBase).map((o) => (
                    <option key={o.versionId} value={o.versionId}>Copia de {o.etiqueta}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">La ficha nueva empieza como borrador con todos los espacios y reglas del origen.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nf-facultad" className={etiqueta}>Facultad</label>
                  <select id="nf-facultad" className={campo} value={facultadId} onChange={(e) => { setFacultadId(e.target.value); setCarreraId(""); }}>
                    <option value="">Todas las facultades</option>
                    {facultades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="nf-carrera" className={etiqueta}>Carrera</label>
                  <select id="nf-carrera" className={campo} value={carreraId} onChange={(e) => setCarreraId(e.target.value)} disabled={!facultadId}>
                    <option value="">Todas las carreras</option>
                    {carrerasFacultad.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={cerrar} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button type="submit" disabled={pendiente} className="bg-brand-red hover:bg-red-800 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-bold text-sm">
                {pendiente ? "Creando…" : "Crear borrador"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
