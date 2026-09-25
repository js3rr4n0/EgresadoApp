import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSeguimientoCoordinador } from "@/app/actions/registrosActividad";
import Link from "next/link";

const ESTADO_INFORME: Record<string, { label: string; clase: string }> = {
  redactando: { label: "Borrador", clase: "bg-white text-slate-500 border-slate-300" },
  enviado: { label: "Enviado, en revisión", clase: "bg-blue-50 text-blue-800 border-blue-300" },
  observado: { label: "Con correcciones", clase: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", clase: "bg-emerald-600 text-white border-emerald-700" },
};

export default async function SeguimientoCoordinadorPage() {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
    redirect("/login");
  }

  const res = await getSeguimientoCoordinador();
  const estudiantes = res.success && res.estudiantes ? res.estudiantes : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-extrabold text-card-dark">Seguimiento de pasantías en ejecución</h1>
        <p className="text-xs text-muted mt-1 font-semibold">
          Estado general de avance de los estudiantes con propuesta de Pasantía en ejecución
          {session.rol === "coordinador" ? " asignados a tu coordinación" : ""}.
        </p>
      </div>

      {!res.success ? (
        <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>
      ) : estudiantes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
          <p className="text-sm font-semibold text-slate-600">No hay pasantías en ejecución por el momento.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-border text-slate-600 font-bold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4">Estudiante</th>
                <th className="py-3.5 px-4">Asesor</th>
                <th className="py-3.5 px-4">Mes / Semana</th>
                <th className="py-3.5 px-4">Avance</th>
                <th className="py-3.5 px-4">Por Revisar</th>
                <th className="py-3.5 px-4">Informes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {estudiantes.map((e) => (
                <tr key={e.propuestaId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-bold text-card-dark">{e.egresado?.nombreCompleto}</p>
                    <p className="text-[11px] text-muted font-mono">{e.egresado?.carnet} — {e.egresado?.carrera}</p>
                  </td>
                  <td className="py-4 px-4 text-slate-600 text-xs font-semibold">{e.asesor}</td>
                  <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                    Mes {e.mesActual}, Sem. {e.semanaActual}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-red rounded-full" style={{ width: `${e.porcentajeAvance}%` }} />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-700">{e.porcentajeAvance}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {e.pendientesRevision > 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                        {e.pendientesRevision}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-1.5">
                      {e.informes.map((im) => {
                        const estado = ESTADO_INFORME[im.estado] || ESTADO_INFORME.redactando;
                        return (
                          <Link
                            key={im.numero}
                            href={`/informes/${im.id}/imprimir`}
                            target="_blank"
                            title={`Informe #${im.numero}: ${estado.label}${im.cerrado ? " (fecha límite vencida)" : ""}`}
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold border ${estado.clase} ${
                              im.cerrado && im.estado === "redactando" ? "ring-2 ring-red-300" : ""
                            }`}
                          >
                            {im.numero}
                          </Link>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-border text-[10px] font-semibold text-slate-500">
            <span className="font-bold uppercase">Informes:</span>
            {Object.values(ESTADO_INFORME).map((e) => (
              <span key={e.label} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded border ${e.clase}`} />
                {e.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-slate-300 ring-2 ring-red-300" />
              Fecha límite vencida sin envío
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
