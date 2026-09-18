import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformesMensualesAsesor } from "@/app/actions/informesMensuales";

function formatFecha(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

const ESTADO_INFO: Record<string, { label: string; badge: string }> = {
  redactando: { label: "El estudiante aún redacta", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Pendiente de tu revisión", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  observado: { label: "Correcciones solicitadas", badge: "bg-amber-100 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
};

export default async function InformesMensualesAsesorPage({
  params,
}: {
  params: Promise<{ propuestaId: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) notFound();

  const res = await getInformesMensualesAsesor(id);
  if (!res.success || !res.informes) {
    return (
      <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudieron cargar los informes mensuales."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">📊 Informes Mensuales de Pasantía</h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            Estudiante: {res.egresado?.nombreCompleto} ({res.egresado?.carnet})
          </p>
        </div>
        <Link
          href="/asesor"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          ← Volver al Panel
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {res.informes.map((informe) => {
          const info = ESTADO_INFO[informe.estado] || ESTADO_INFO.redactando;
          return (
            <div key={informe.id} className="bg-white border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-card-dark text-sm">Informe #{informe.numero}</h3>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${info.badge}`}>
                  {info.label}
                </span>
              </div>
              <div className="text-[11px] text-muted font-semibold space-y-0.5">
                <p>Fecha límite: <span className="text-slate-700">{formatFecha(informe.fechaLimite)}</span></p>
                {informe.enviadoEn && <p>Enviado: <span className="text-slate-700">{formatFecha(informe.enviadoEn)}</span></p>}
              </div>
              {informe.estado === "redactando" ? (
                <span className="mt-auto text-center text-[11px] font-bold text-slate-400 py-2.5">
                  Aún no disponible
                </span>
              ) : (
                <Link
                  href={`/asesor/informes/mensual/${id}/${informe.id}`}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
                >
                  Ver Informe
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
