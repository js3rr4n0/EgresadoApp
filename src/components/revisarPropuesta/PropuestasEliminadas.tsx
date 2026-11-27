// Registro de propuestas eliminadas (A5), plegable, al final de «Gestión de Propuestas». Solo superadministrador.
// Componente de servidor.

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { propuestasEliminadas, usuarios } from "@/lib/schema";
import { nombreEstado } from "@/lib/historialEstados";
import { fechaCortaSV, horaSV } from "@/lib/fechasTexto";

const TIPO: Record<string, string> = { proyecto: "Proyecto", investigacion: "Investigación", pasantia: "Pasantía" };

export default async function PropuestasEliminadas() {
  let filas: { e: typeof propuestasEliminadas.$inferSelect; quien: string | null }[] = [];
  try {
    filas = await db
      .select({ e: propuestasEliminadas, quien: usuarios.nombreCompleto })
      .from(propuestasEliminadas)
      .leftJoin(usuarios, eq(usuarios.id, propuestasEliminadas.eliminadaPor))
      .orderBy(desc(propuestasEliminadas.eliminadaEn))
      .limit(100);
  } catch {
    return null; // tabla todavía no creada en esta base
  }
  if (filas.length === 0) return null;
  return (
    <details className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <summary className="cursor-pointer px-5 py-4 font-bold text-card-dark hover:bg-gray-50">
        Propuestas eliminadas ({filas.length})
        <span className="block text-xs font-normal text-muted">Registro de lo que eliminó la administración, con su justificación.</span>
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Propuesta</th>
              <th className="px-4 py-2 text-left">Egresados</th>
              <th className="px-4 py-2 text-left">Estado al eliminar</th>
              <th className="px-4 py-2 text-left">Justificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filas.map(({ e, quien }) => (
              <tr key={e.id} className="align-top">
                <td className="px-4 py-2 whitespace-nowrap">
                  {fechaCortaSV(e.eliminadaEn.toISOString())}
                  <span className="block text-xs text-muted">{horaSV(e.eliminadaEn.toISOString())}{quien ? ` · ${quien}` : ""}</span>
                </td>
                <td className="px-4 py-2">
                  <span className="font-semibold text-card-dark">#{e.numero} · {TIPO[e.tipo] ?? e.tipo}</span>
                  <span className="block text-xs text-gray-600">{e.titulo || "Sin título"}{e.empresa ? ` · ${e.empresa}` : ""}</span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-700">
                  {e.integrantes.map((i) => `${i.nombre}${i.carnet ? ` (${i.carnet})` : ""}`).join(", ")}
                </td>
                <td className="px-4 py-2 text-xs text-gray-700">{nombreEstado(e.estado)}</td>
                <td className="px-4 py-2 text-gray-800">{e.justificacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
