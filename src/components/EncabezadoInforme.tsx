// Tarjeta de cabecera de un informe (período o final), con el mismo esquema que "Datos de la actividad" del registro:
// título destacado y los datos en pares etiqueta/valor. La usan la vista del egresado y la revisión del asesor.
import Link from "next/link";
import { esInformeFinal, formatearFechaLarga } from "@/lib/periodosPasantia";

export const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  redactando: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Enviado, en revisión", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase text-slate-400">{etiqueta}</dt>
      <dd className="mt-0.5 text-slate-800">{children}</dd>
    </div>
  );
}

export default function EncabezadoInforme({
  informe,
  periodo,
  paginasEstimadas,
  paginasMinimas,
}: {
  informe: { id: number; numero: number; estado: string; fechaLimite: string; enviadoEn: string | null; cumplimiento: string | null };
  periodo: { inicio: string | null; fin: string | null } | null;
  paginasEstimadas?: number;
  paginasMinimas?: number;
}) {
  const estado = ESTADO_INFORME[informe.estado] || ESTADO_INFORME.redactando;
  const final = esInformeFinal(informe.numero);
  const cumpleExtension = paginasEstimadas !== undefined && paginasMinimas !== undefined && paginasEstimadas >= paginasMinimas;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Datos del informe</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${estado.badge}`}>{estado.label}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold text-slate-900 leading-tight">
            {final ? "Informe " : "Informe del "}
            <span className="text-unicaes">{final ? "final" : `período ${informe.numero}`}</span>
          </p>
          {periodo?.inicio && periodo.fin && (
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Del {formatearFechaLarga(periodo.inicio)} al {formatearFechaLarga(periodo.fin)}
            </p>
          )}
        </div>
        <Link
          href={`/informes/${informe.id}/imprimir`}
          target="_blank"
          className="text-center px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs shrink-0"
        >
          Ver documento del informe
        </Link>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-xs pt-1">
        <Dato etiqueta="Fecha de entrega">
          <span className="font-bold">{formatearFechaLarga(periodo?.fin ?? informe.fechaLimite)}</span>
          <span className="block text-[11px] text-slate-500 font-semibold">Límite de la cohorte: {formatearFechaLarga(informe.fechaLimite)}</span>
        </Dato>
        <Dato etiqueta="Envío">
          <span className="font-bold">{informe.enviadoEn || "Aún no enviado"}</span>
          {informe.cumplimiento && (
            <span
              className={`block text-[11px] font-semibold ${informe.cumplimiento === "a_tiempo" ? "text-emerald-700" : "text-red-700"}`}
            >
              {informe.cumplimiento === "a_tiempo" ? "Entregado a tiempo" : "Entregado fuera de tiempo"}
            </span>
          )}
        </Dato>
        {paginasEstimadas !== undefined && (
          <Dato etiqueta="Extensión estimada">
            <span className="font-bold">
              {Math.round(paginasEstimadas)}
              {paginasMinimas !== undefined ? ` de ${paginasMinimas}` : ""} páginas
            </span>
            {paginasMinimas !== undefined && (
              <span className={`block text-[11px] font-semibold ${cumpleExtension ? "text-emerald-700" : "text-amber-700"}`}>
                {cumpleExtension ? "Cumple la extensión mínima" : "Aún no alcanza la extensión mínima"}
              </span>
            )}
          </Dato>
        )}
      </dl>
    </div>
  );
}
