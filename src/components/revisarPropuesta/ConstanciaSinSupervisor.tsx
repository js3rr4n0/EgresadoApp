// D2 (specs/COORDINADOR_ASIGNACION.md): franja «Validado por decanato sin supervisor empresarial» para el coordinador,
// el asesor y la administración. Componente de servidor: no muestra nada si la propuesta tiene supervisor.

import { constanciaSinSupervisor } from "@/lib/constanciaSinSupervisorServidor";
import { fechaLargaSV, horaSV } from "@/lib/fechasTexto";

export default async function ConstanciaSinSupervisor({ propuestaId }: { propuestaId: number }) {
  let c;
  try {
    c = await constanciaSinSupervisor(propuestaId);
  } catch {
    return null; // tabla todavía no creada en esta base
  }
  if (c.estado === "no_aplica") return null;

  if (c.estado === "pendiente") {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
        <h2 className="text-sm font-bold text-amber-900">Sin supervisor empresarial: pendiente de aprobación</h2>
        <p className="text-xs text-amber-900 mt-1">
          El egresado pidió trabajar sin supervisor empresarial y la administración todavía no lo aprueba.
        </p>
        {c.motivoEgresado && <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">Motivo del egresado: {c.motivoEgresado}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-gray-50">
        <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <h2 className="font-bold text-card-dark">Validado por decanato sin supervisor empresarial</h2>
      </header>
      <div className="px-5 py-4 space-y-3 text-sm">
        {c.mensaje ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Mensaje de la administración</p>
            <p className="text-gray-900 whitespace-pre-wrap">{c.mensaje}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-600">Aprobado antes de que se pidiera un mensaje: no tiene comentario de la administración.</p>
        )}
        {c.motivoEgresado && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Motivo del egresado</p>
            <p className="text-gray-700 whitespace-pre-wrap">{c.motivoEgresado}</p>
          </div>
        )}
        <p className="text-xs text-gray-500">
          {c.validadaPor ? `Aprobó: ${c.validadaPor}` : "Aprobó la administración"}
          {c.validadaEn ? ` · ${fechaLargaSV(c.validadaEn)}, ${horaSV(c.validadaEn)}` : ""}
        </p>
      </div>
    </section>
  );
}
