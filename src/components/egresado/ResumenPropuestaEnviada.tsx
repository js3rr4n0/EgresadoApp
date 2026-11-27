// Tarjeta de la propuesta enviada en «Mi Trabajo de Graduación» (specs/SEGUIMIENTO_PROPUESTA_EGRESADO.md, T1):
// encabezado con el estado y los datos principales. Sin estado: componente de servidor.

import { fechaCortaSV, horaSV } from "@/lib/fechasTexto";

export type TonoEstado = "accion" | "proceso" | "ok";

const TONO: Record<TonoEstado, string> = {
  accion: "border-brand-red/30 bg-red-50 text-brand-red",
  proceso: "border-gray-300 bg-gray-50 text-gray-700",
  ok: "border-green-200 bg-green-50 text-green-800",
};

const MODALIDAD: Record<string, string> = { proyecto: "Proyecto", investigacion: "Investigación", pasantia: "Pasantía" };

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{etiqueta}</dt>
      <dd className="mt-1 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

const fechaHora = (iso: string) => `${fechaCortaSV(iso)}, ${horaSV(iso)}`;

export default function ResumenPropuestaEnviada({
  propuestaId,
  numero,
  tipo,
  titulo,
  estado,
  tono,
  coordinador,
  asesor,
  asesorPendiente,
  empresa,
  supervisor,
  primerEnvio,
  ultimoReenvio,
  children,
}: {
  propuestaId: number;
  numero: number;
  tipo: string;
  titulo: string | null;
  estado: string;
  tono: TonoEstado;
  coordinador: string | null;
  /** Solo cuando el asesor aceptó (respuesta 1). */
  asesor: string | null;
  /** Hay una solicitud de asesoría esperando respuesta. */
  asesorPendiente: boolean;
  empresa: { nombre: string; direccion: string | null } | null;
  supervisor: string | null;
  primerEnvio: string | null;
  /** Último reenvío (con ajustes o después de un rechazo), si lo hubo. */
  ultimoReenvio: string | null;
  /** Estado actual o mapa de la propuesta. */
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-red">
            Propuesta #{numero} · {MODALIDAD[tipo] ?? tipo}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-card-dark">{titulo || "Trabajo de graduación"}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${TONO[tono]}`}>{estado}</span>
          <a
            href={`/egresado/redactar/imprimir?id=${propuestaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Ver documento
          </a>
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
        <Dato etiqueta="Enviada">
          {primerEnvio ? fechaHora(primerEnvio) : "Sin fecha"}
          {ultimoReenvio && <span className="block text-xs text-muted">Último reenvío: {fechaHora(ultimoReenvio)}</span>}
        </Dato>
        <Dato etiqueta="Coordinador">{coordinador ?? <span className="text-muted">Sin asignar</span>}</Dato>
        <Dato etiqueta="Docente asesor">
          {asesor ?? <span className="text-muted">{asesorPendiente ? "En proceso de asignación" : "Sin asignar"}</span>}
        </Dato>
        <Dato etiqueta="Empresa o institución">
          {empresa ? (
            <>
              {empresa.nombre}
              {empresa.direccion && <span className="block truncate text-xs text-muted" title={empresa.direccion}>{empresa.direccion}</span>}
            </>
          ) : (
            <span className="text-muted">No aplica</span>
          )}
        </Dato>
        <Dato etiqueta="Supervisor empresarial">{supervisor ?? <span className="text-muted">Sin supervisor</span>}</Dato>
      </dl>

      {children && <div className="border-t border-border px-6 py-5">{children}</div>}
    </section>
  );
}
