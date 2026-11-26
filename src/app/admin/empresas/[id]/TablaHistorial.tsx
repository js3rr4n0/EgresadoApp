"use client";

// Historial de egresados en la empresa (entrega V4): quién hizo su proceso aquí, en qué modalidad, carrera y cohorte,
// con qué asesor y con qué resultado. Filtros y descarga en CSV.

import Link from "next/link";
import { useMemo, useState } from "react";
import { aCsv } from "@/lib/seguimientoCohortes";
import { NOMBRE_MODALIDAD } from "@/lib/estadisticasEmpresas";
import { AYUDA_RESULTADO, NOMBRE_RESULTADO, conteoResultados, type FilaHistorial, type Resultado } from "@/lib/historialEmpresa";
import { formatoNota } from "@/lib/valoraciones";
import Nota from "@/components/valoraciones/Nota";

const CLASE_RESULTADO: Record<Resultado, string> = {
  en_curso: "bg-blue-50 text-blue-800 border-blue-200",
  satisfactorio: "bg-green-100 text-green-800 border-green-200",
  no_satisfactorio: "bg-red-100 text-brand-red border-red-200",
  concluido: "bg-gray-100 text-gray-700 border-gray-200",
  baja: "bg-gray-800 text-white border-gray-800",
};
const ORDEN_RESULTADOS: Resultado[] = ["satisfactorio", "no_satisfactorio", "concluido", "en_curso", "baja"];
const claseSelect = "w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:border-brand-red outline-none";

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });

export default function TablaHistorial({ filas, empresa }: { filas: FilaHistorial[]; empresa: string }) {
  const [buscar, setBuscar] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [cohorte, setCohorte] = useState("");
  const [carrera, setCarrera] = useState("");
  const [resultado, setResultado] = useState("");

  const cohortes = useMemo(() => [...new Set(filas.map((f) => f.cohorte))], [filas]);
  const carreras = useMemo(() => [...new Set(filas.map((f) => f.carrera).filter((c): c is string => !!c))].sort(), [filas]);
  const conteo = useMemo(() => conteoResultados(filas), [filas]);

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!modalidad || f.modalidad === modalidad) &&
        (!cohorte || f.cohorte === cohorte) &&
        (!carrera || f.carrera === carrera) &&
        (!resultado || f.resultado === resultado) &&
        (!q || f.egresado.toLowerCase().includes(q) || f.titulo.toLowerCase().includes(q) || (f.asesor ?? "").toLowerCase().includes(q)),
    );
  }, [filas, buscar, modalidad, cohorte, carrera, resultado]);

  const descargar = () => {
    const datos = [
      ["Egresado", "Carrera", "Modalidad", "Cohorte", "Título", "Asesor", "Resultado", "Cierre", "Nota del asesor al egresado", "Nota del egresado a la empresa", "Motivo de la baja"],
      ...visibles.map((f) => [
        f.egresado,
        f.carrera,
        NOMBRE_MODALIDAD[f.modalidad],
        f.cohorte,
        f.titulo,
        f.asesor,
        NOMBRE_RESULTADO[f.resultado],
        f.cerradoEn ? f.cerradoEn.slice(0, 10) : "",
        f.notaAsesorAlEgresado != null ? formatoNota(f.notaAsesorAlEgresado) : "",
        f.notaEgresadoAEmpresa != null ? formatoNota(f.notaEgresadoAEmpresa) : "",
        f.motivoBaja,
      ]),
    ];
    const url = URL.createObjectURL(new Blob([aCsv(datos)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-${empresa.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-").replace(/^-|-$/g, "")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (filas.length === 0) {
    return <p className="text-sm text-muted">Ningún egresado ha realizado su proceso en esta empresa.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Resumen por resultado: cada tarjeta filtra la tabla */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {ORDEN_RESULTADOS.map((r) => (
          <button
            key={r}
            type="button"
            title={AYUDA_RESULTADO[r]}
            onClick={() => setResultado(resultado === r ? "" : r)}
            className={`text-left rounded-xl border px-3 py-2 transition-colors ${resultado === r ? "border-brand-red ring-1 ring-brand-red bg-white" : "border-border bg-white hover:border-gray-400"}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{NOMBRE_RESULTADO[r]}</p>
            <p className="text-lg font-bold text-gray-800">{conteo[r]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-2">
        <input
          type="text"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar egresado, título o asesor..."
          className="w-full lg:w-72 px-3 py-2 rounded-lg border border-border text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
          <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={claseSelect}>
            <option value="">Todas las modalidades</option>
            {Object.entries(NOMBRE_MODALIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={cohorte} onChange={(e) => setCohorte(e.target.value)} className={claseSelect}>
            <option value="">Todas las cohortes</option>
            {cohortes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={carrera} onChange={(e) => setCarrera(e.target.value)} className={claseSelect}>
            <option value="">Todas las carreras</option>
            {carreras.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={resultado} onChange={(e) => setResultado(e.target.value)} className={claseSelect}>
            <option value="">Todos los resultados</option>
            {ORDEN_RESULTADOS.map((r) => <option key={r} value={r}>{NOMBRE_RESULTADO[r]}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={descargar}
          disabled={visibles.length === 0}
          className="shrink-0 px-4 py-2 rounded-lg border border-border bg-white text-sm font-bold text-gray-700 hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-50"
        >
          Descargar CSV
        </button>
      </div>

      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted border-y border-border bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2">Egresado</th>
              <th className="text-left px-3 py-2">Modalidad</th>
              <th className="text-left px-3 py-2">Cohorte</th>
              <th className="text-left px-3 py-2">Asesor</th>
              <th className="text-left px-3 py-2">Resultado</th>
              <th className="text-center px-3 py-2">Nota del<br />asesor</th>
              <th className="text-center px-3 py-2">Nota a la<br />empresa</th>
              <th className="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibles.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-muted">Ningún registro coincide con los filtros.</td></tr>
            )}
            {visibles.map((f) => (
              <tr key={`${f.propuestaId}-${f.egresadoId}`} className="align-top hover:bg-gray-50/70">
                <td className="px-5 py-2.5">
                  <p className="font-semibold text-gray-800">{f.egresado}</p>
                  <p className="text-xs text-muted">{f.carrera ?? "Sin carrera"}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[280px]" title={f.titulo}>{f.titulo}</p>
                </td>
                <td className="px-3 py-2.5 text-gray-700">{NOMBRE_MODALIDAD[f.modalidad]}</td>
                <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{f.cohorte}</td>
                <td className="px-3 py-2.5 text-gray-700">{f.asesor ?? <span className="text-muted">Sin asignar</span>}</td>
                <td className="px-3 py-2.5">
                  <span title={AYUDA_RESULTADO[f.resultado]} className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded-md border whitespace-nowrap ${CLASE_RESULTADO[f.resultado]}`}>
                    {NOMBRE_RESULTADO[f.resultado]}
                  </span>
                  {f.cerradoEn && <p className="text-[11px] text-muted mt-1">Cierre: {fechaCorta(f.cerradoEn)}</p>}
                  {f.motivoBaja && <p className="text-[11px] text-muted mt-1 max-w-[220px]">Motivo: {f.motivoBaja}</p>}
                </td>
                <td className="px-3 py-2.5 text-center"><Nota valor={f.notaAsesorAlEgresado} vacio="—" /></td>
                <td className="px-3 py-2.5 text-center"><Nota valor={f.notaEgresadoAEmpresa} vacio="—" /></td>
                <td className="px-5 py-2.5 text-right">
                  <Link href={`/admin/propuestas/${f.propuestaId}`} className="text-xs font-semibold text-brand-red hover:underline whitespace-nowrap">Ver proceso</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Un trabajo es satisfactorio cuando el proceso cerró y el asesor valoró al egresado con 6 o más. Las bajas aparecen en el historial,
        pero no cuentan en los procesos de la tabla de empresas.
      </p>
    </div>
  );
}
