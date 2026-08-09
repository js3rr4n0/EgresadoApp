import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ReportesMensualesPage() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <span>📊 Seguimiento de Reportes Mensuales</span>
            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-full">
              🛠️ En Construcción
            </span>
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

      {/* Main Construction Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 text-center shadow-sm max-w-3xl mx-auto space-y-6">
        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">
          🚧
        </div>

        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
            ¡Módulo de Reportes Mensuales en Construcción!
          </h2>
          <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-xl mx-auto font-medium">
            Estamos diseñando y preparando la plataforma para que puedas redactar, adjuntar evidencias y enviar tus informes mensuales directamente a tu docente asesor y supervisor empresarial.
          </p>
        </div>

        {/* Feature Cards Placeholder */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <span className="text-xl">📅</span>
            <h3 className="font-extrabold text-slate-900 text-xs">Informes Periódicos</h3>
            <p className="text-[11px] text-slate-500">Registro mensual de actividades completadas según cronograma.</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <span className="text-xl">📎</span>
            <h3 className="font-extrabold text-slate-900 text-xs">Subida de Evidencias</h3>
            <p className="text-[11px] text-slate-500">Adjunta documentos, firmas y anexos de respaldo digital.</p>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <span className="text-xl">✍️</span>
            <h3 className="font-extrabold text-slate-900 text-xs">Evaluación del Asesor</h3>
            <p className="text-[11px] text-slate-500">Retroalimentación directa y aprobación del avance mensual.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-semibold">
            Te notificaremos en tu panel principal tan pronto como las entregas de este período se habiliten oficial.
          </p>
        </div>
      </div>
    </div>
  );
}
