"use client";

// Tabla de asesores (entrega V5): carreras, procesos, cohortes, empresas y récord de valoraciones de los egresados.
// El administrador puede deshabilitar y editar; el coordinador la ve en solo lectura.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FilaAsesor } from "@/lib/asesoresServidor";
import { formatoNota, tonoNota } from "@/lib/valoraciones";
import Nota from "@/components/valoraciones/Nota";
import DialogoEstadoAsesor from "./DialogoEstadoAsesor";

type Orden = "nombre" | "mejor" | "peor" | "activos" | "cerrados";
const claseSelect = "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:border-brand-red outline-none";

export default function TablaAsesores({
  filas,
  carreras,
  rutaBase,
  gestionar,
}: {
  filas: FilaAsesor[];
  carreras: string[];
  /** /admin/asesores o /coordinador/asesores */
  rutaBase: string;
  /** El administrador puede deshabilitar y editar. */
  gestionar: boolean;
}) {
  const [buscar, setBuscar] = useState("");
  const [carrera, setCarrera] = useState("");
  const [desempeno, setDesempeno] = useState("");
  const [estado, setEstado] = useState(gestionar ? "" : "activo");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [dialogo, setDialogo] = useState<FilaAsesor | null>(null);

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const lista = filas.filter(
      (f) =>
        (!q || f.nombre.toLowerCase().includes(q) || f.correo.toLowerCase().includes(q)) &&
        (!carrera || f.carreras.includes(carrera)) &&
        (!desempeno || tonoNota(f.nota.promedio) === desempeno) &&
        (!estado || (estado === "activo" ? f.activo : !f.activo)),
    );
    const porNombre = (a: FilaAsesor, b: FilaAsesor) => a.nombre.localeCompare(b.nombre, "es");
    return lista.sort((a, b) => {
      if (orden === "mejor" || orden === "peor") {
        const na = a.nota.promedio, nb = b.nota.promedio;
        if (na == null || nb == null) return (na == null ? 1 : 0) - (nb == null ? 1 : 0) || porNombre(a, b);
        return (orden === "peor" ? na - nb : nb - na) || porNombre(a, b);
      }
      if (orden === "activos") return b.procesosActivos - a.procesosActivos || porNombre(a, b);
      if (orden === "cerrados") return b.procesosCerrados - a.procesosCerrados || porNombre(a, b);
      return porNombre(a, b);
    });
  }, [filas, buscar, carrera, desempeno, estado, orden]);

  const conteo = useMemo(() => {
    const c = { alta: 0, media: 0, baja: 0, ninguna: 0 };
    filas.forEach((f) => c[tonoNota(f.nota.promedio)]++);
    return c;
  }, [filas]);

  return (
    <div className="space-y-4">
      {/* Desempeño: cada tarjeta filtra la tabla */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ["alta", "Desempeño alto", "8 o más"],
          ["media", "Desempeño medio", "De 6 a 7.9"],
          ["baja", "Desempeño bajo", "Menos de 6"],
          ["ninguna", "Sin valoraciones", "Aún sin procesos valorados"],
        ] as const).map(([clave, nombre, ayuda]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setDesempeno(desempeno === clave ? "" : clave)}
            className={`text-left rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors ${desempeno === clave ? "border-brand-red ring-1 ring-brand-red" : "border-border hover:border-gray-400"}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{nombre}</p>
            <p className="text-2xl font-bold text-gray-800">{conteo[clave]}</p>
            <p className="text-[11px] text-muted">{ayuda}</p>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-border flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full lg:w-80 px-3 py-2 rounded-lg border border-border text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
            <select value={carrera} onChange={(e) => setCarrera(e.target.value)} className={claseSelect}>
              <option value="">Todas las carreras</option>
              {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={desempeno} onChange={(e) => setDesempeno(e.target.value)} className={claseSelect}>
              <option value="">Todo desempeño</option>
              <option value="alta">Alto (8 o más)</option>
              <option value="media">Medio (6 a 7.9)</option>
              <option value="baja">Bajo (menos de 6)</option>
              <option value="ninguna">Sin valoraciones</option>
            </select>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={claseSelect}>
              <option value="">Activos e inactivos</option>
              <option value="activo">Solo activos</option>
              <option value="inactivo">Solo inactivos</option>
            </select>
            <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className={claseSelect}>
              <option value="nombre">Ordenar por nombre</option>
              <option value="mejor">Mejor nota</option>
              <option value="peor">Peor nota</option>
              <option value="activos">Más procesos en curso</option>
              <option value="cerrados">Más procesos cerrados</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-muted">
          {visibles.length === filas.length ? `${filas.length} asesores` : `${visibles.length} de ${filas.length} asesores con los filtros aplicados`}
          {" · "}La nota histórica es el promedio de todos sus procesos valorados por los egresados (escala de 1 a 10).
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-card-dark border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 min-w-[200px]">Asesor</th>
                <th className="text-left px-2.5 py-3">Carreras</th>
                <th className="text-center px-2.5 py-3">En curso</th>
                <th className="text-center px-2.5 py-3">Cerrados</th>
                <th className="text-left px-2.5 py-3">Cohortes</th>
                <th className="text-center px-2.5 py-3">Empresas</th>
                <th className="text-center px-2.5 py-3">Nota<br />histórica</th>
                <th className="text-left px-2.5 py-3">Última<br />evaluación</th>
                <th className="text-center px-2.5 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibles.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-muted">Ningún asesor coincide con los filtros.</td></tr>
              )}
              {visibles.map((f) => (
                <tr key={f.id} className={`hover:bg-gray-50/70 ${f.activo ? "" : "bg-gray-50/60"}`}>
                  <td className="px-4 py-3">
                    <Link href={`${rutaBase}/${f.id}`} className="font-bold text-gray-800 hover:text-brand-red">{f.nombre}</Link>
                    <p className="text-xs text-muted">{f.correo}</p>
                  </td>
                  <td className="px-2.5 py-3 text-xs text-gray-700 max-w-[220px]">
                    {f.carreras.length ? f.carreras.join(", ") : <span className="text-muted">Sin carrera</span>}
                  </td>
                  <td className="px-2.5 py-3 text-center font-bold text-gray-800">{f.procesosActivos}</td>
                  <td className="px-2.5 py-3 text-center font-bold text-gray-800">
                    {f.procesosCerrados}
                    {f.bajas > 0 && <p className="text-[11px] font-normal text-muted">{f.bajas} {f.bajas === 1 ? "baja" : "bajas"}</p>}
                  </td>
                  <td className="px-2.5 py-3">
                    {f.cohortes.length ? (
                      <>
                        <span className="font-semibold text-gray-800 whitespace-nowrap">{f.cohortes[0]}</span>
                        <p className="text-[11px] text-muted">{f.cohortes.length} en total</p>
                      </>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-2.5 py-3 text-center font-bold text-gray-800">{f.empresas}</td>
                  <td className="px-2.5 py-3 text-center">
                    <Nota valor={f.nota.promedio} vacio="—" />
                    {f.nota.procesos > 0 && <p className="text-[11px] text-muted mt-0.5">{f.nota.procesos} {f.nota.procesos === 1 ? "proceso" : "procesos"}</p>}
                  </td>
                  <td className="px-2.5 py-3">
                    {f.nota.ultima ? (
                      <>
                        <span className="font-bold text-gray-800">{formatoNota(f.nota.ultima.promedio)}</span>
                        <p className="text-[11px] text-muted whitespace-nowrap">{f.nota.ultima.cohorte}</p>
                      </>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-2.5 py-3 text-center">
                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap ${f.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {f.activo ? "Activo" : "Inactivo"}
                    </span>
                    {gestionar && (
                      <button
                        type="button"
                        onClick={() => setDialogo(f)}
                        className={`block mx-auto mt-1.5 text-[11px] font-bold hover:underline ${f.activo ? "text-gray-500 hover:text-brand-red" : "text-green-700"}`}
                      >
                        {f.activo ? "Deshabilitar" : "Habilitar"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`${rutaBase}/${f.id}`} className="px-2.5 py-1.5 text-xs font-bold text-brand-red bg-brand-red/5 hover:bg-brand-red hover:text-white rounded-lg transition-colors whitespace-nowrap">
                        Ver más
                      </Link>
                      {gestionar && (
                        <Link href={`/admin/usuarios/${f.id}/editar`} title="Editar datos" className="p-1.5 text-gray-400 hover:text-brand-red transition-colors bg-gray-50 hover:bg-red-50 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dialogo && (
        <DialogoEstadoAsesor
          asesor={{ id: dialogo.id, nombre: dialogo.nombre, activo: dialogo.activo, nota: dialogo.nota.promedio, procesosActivos: dialogo.procesosActivos }}
          onCerrar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
