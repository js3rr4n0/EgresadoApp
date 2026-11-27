// Documentos de soporte de cada integrante (R6): quién tiene cada uno y quién tiene pendientes. Sin estado: sirve en
// servidor y cliente. Los nombres de los documentos son los de DOCUMENTOS_SOPORTE (revisionPropuestaServidor.ts).

import type { DocumentosIntegrante } from "@/lib/revisionPropuestaServidor";

const COLUMNAS = [
  { tipo: "pago_tg", nombre: "Inscripción" },
  { tipo: "servicio_social", nombre: "Servicio social" },
  { tipo: "certificacion_notas", nombre: "Notas" },
];

export default function TablaDocumentosEquipo({ equipo }: { equipo: DocumentosIntegrante[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Integrante</th>
            {COLUMNAS.map((c) => <th key={c.tipo} className="px-3 py-2 text-center">{c.nombre}</th>)}
            <th className="px-3 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {equipo.map((u) => (
            <tr key={u.usuarioId}>
              <td className="px-3 py-2">
                <span className="font-semibold text-card-dark">{u.nombre}</span>
                <span className="block text-xs text-muted">{u.carnet ?? "sin carnet"}{u.esLider ? " · líder" : ""}</span>
              </td>
              {COLUMNAS.map((c) => (
                <td key={c.tipo} className="px-3 py-2 text-center">
                  {u.documentos[c.tipo] ? (
                    <span className="text-xs font-bold text-green-700">Subido</span>
                  ) : (
                    <span className="text-xs font-bold text-brand-red">Falta</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2">
                {u.faltan.length === 0 ? (
                  <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800">Completo</span>
                ) : (
                  <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {u.faltan.length} pendiente{u.faltan.length > 1 ? "s" : ""}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
