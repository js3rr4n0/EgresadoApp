import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getInformesMensuales } from "@/app/actions/informesMensuales";

function formatFecha(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
}

const ESTADO_INFO: Record<string, { label: string; badge: string; accion: string }> = {
  redactando: { label: "Por Redactar", badge: "bg-slate-100 text-slate-700 border-slate-300", accion: "Comenzar Informe" },
  enviado: { label: "En Revisión del Asesor", badge: "bg-blue-100 text-blue-800 border-blue-300", accion: "Ver Informe Enviado" },
  observado: { label: "Ajustes Solicitados", badge: "bg-amber-100 text-amber-900 border-amber-300", accion: "Corregir Observaciones" },
  aprobado: { label: "Aprobado por el Asesor", badge: "bg-emerald-100 text-emerald-900 border-emerald-300", accion: "Ver Informe Aprobado" },
};

export default async function ReportesMensualesPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  const [propuestaActiva] = await db
    .select()
    .from(propuestas)
    .where(
      and(
        eq(propuestas.egresadoId, session.userId),
        eq(propuestas.tipo, "pasantia"),
        eq(propuestas.estado, "en_ejecucion")
      )
    )
    .limit(1);

  if (!propuestaActiva) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <span>📊 Seguimiento de Reportes Mensuales</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Módulo de control de bitácoras, avances periódicos e informes de avance del plan de trabajo.
            </p>
          </div>
          <Link
            href="/egresado"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
          >
            <span>← Volver al Panel Principal</span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 text-center shadow-sm max-w-3xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-inner">
            ⏳
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900">Este módulo aún no está disponible para ti</h2>
          <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-xl mx-auto font-medium">
            Los informes mensuales se habilitan una vez que tu propuesta de <strong>Pasantía</strong> se encuentra oficialmente
            <strong> en ejecución</strong>. Actualmente solo aplica a este tipo de proceso.
          </p>
        </div>
      </div>
    );
  }

  const res = await getInformesMensuales(propuestaActiva.id);

  if (!res.success || !res.informes) {
    return (
      <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudieron cargar los informes mensuales."}
      </div>
    );
  }

  const hoy = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <span>📊 Seguimiento de Reportes Mensuales</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Pasantía en {res.empresa?.nombre || "empresa asignada"} — Asesor: {res.asesor?.nombreCompleto || "Sin asignar"}
          </p>
        </div>
        <Link
          href="/egresado"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          <span>← Volver al Panel Principal</span>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          Debes redactar y enviar un informe por cada mes de tu pasantía, describiendo las actividades realizadas
          semana a semana y adjuntando evidencia fotográfica. Tu asesor revisará cada informe y podrá aprobarlo o
          solicitarte ajustes antes de darlo por recibido.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {res.informes.map((informe) => {
          const atrasado = informe.estado === "redactando" && new Date(informe.fechaLimite) < hoy;
          const info = ESTADO_INFO[informe.estado] || ESTADO_INFO.redactando;

          return (
            <div key={informe.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm">Informe Mensual #{informe.numero}</h3>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${atrasado ? "bg-red-100 text-red-800 border-red-300" : info.badge}`}>
                  {atrasado ? "Atrasado" : info.label}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                <p>Fecha límite: <span className="text-slate-700">{formatFecha(informe.fechaLimite)}</span></p>
                {informe.enviadoEn && <p>Enviado: <span className="text-slate-700">{formatFecha(informe.enviadoEn)}</span></p>}
              </div>

              {informe.estado === "observado" && (
                <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Tu asesor solicitó correcciones. Ábrelo para revisar sus observaciones.
                </p>
              )}

              <Link
                href={`/egresado/reportes/${informe.id}`}
                className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                {info.accion}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
