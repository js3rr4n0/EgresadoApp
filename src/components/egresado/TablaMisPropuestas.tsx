// Tabla «Mis propuestas» del panel del egresado (T3): estados con nombres claros y colores de la universidad, acciones
// sin emojis. Componente de servidor; el botón de crear propuesta llega como `crear`.

import Link from "next/link";
import { accionFila, estadoFila, type TonoFila } from "@/lib/filaPropuestaEgresado";

const TONO: Record<TonoFila, string> = {
  borrador: "border-gray-200 bg-gray-50 text-gray-600",
  accion: "border-brand-red/30 bg-red-50 text-brand-red",
  proceso: "border-slate-300 bg-slate-100 text-slate-700",
  ok: "border-green-200 bg-green-50 text-green-800",
};

const MODALIDAD: Record<string, string> = { proyecto: "Proyecto", investigacion: "Investigación", pasantia: "Pasantía" };

export interface PropuestaTabla {
  id: number;
  numero: number;
  tipo: string;
  titulo: string | null;
  estado: string;
  observaciones: string | null;
}

function Accion({ p }: { p: PropuestaTabla }) {
  const a = accionFila(p);
  const clase = a.principal
    ? "bg-brand-red text-white hover:bg-brand-red-hover"
    : "border border-border bg-white text-gray-700 hover:border-brand-red hover:text-brand-red";
  const comun = `inline-flex items-center rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${clase}`;
  return a.externa ? (
    <a href={a.href} target="_blank" rel="noopener noreferrer" className={comun}>{a.texto}</a>
  ) : (
    <Link href={a.href} className={comun}>{a.texto}</Link>
  );
}

export default function TablaMisPropuestas({
  propuestas,
  equipo,
  idActiva,
  hayEnviada,
  crear,
}: {
  propuestas: PropuestaTabla[];
  /** Integrante (no líder) de la propuesta de un equipo. */
  equipo: { propuesta: PropuestaTabla; lider: string } | null;
  /** La propuesta enviada que está en proceso (las demás quedan en espera). */
  idActiva: number | null;
  hayEnviada: boolean;
  crear: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-card-dark">Mis propuestas ({propuestas.length}/3)</h2>
          <p className="mt-0.5 text-sm text-muted">
            {hayEnviada
              ? "Mientras una propuesta está en proceso, las demás quedan en espera."
              : "Puedes redactar hasta 3 propuestas y enviar la que mejor te convenga."}
          </p>
        </div>
        {crear}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-6 py-3 text-left">Propuesta</th>
              <th className="px-6 py-3 text-left">Título</th>
              <th className="px-6 py-3 text-left">Modalidad</th>
              <th className="px-6 py-3 text-left">Estado</th>
              <th className="px-6 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {equipo ? (
              <tr>
                <td className="px-6 py-4 font-bold text-card-dark">#{equipo.propuesta.numero}</td>
                <td className="px-6 py-4">
                  <span className="block max-w-[320px] truncate text-gray-800" title={equipo.propuesta.titulo ?? ""}>
                    {equipo.propuesta.titulo || "Sin título"}
                  </span>
                  <span className="text-xs text-muted">Equipo de {equipo.lider}</span>
                </td>
                <td className="px-6 py-4 text-gray-700">{MODALIDAD[equipo.propuesta.tipo] ?? equipo.propuesta.tipo}</td>
                <td className="px-6 py-4">
                  {(() => {
                    const e = estadoFila(equipo.propuesta, false);
                    return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONO[e.tono]}`}>{e.texto}</span>;
                  })()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/egresado/redactar?id=${equipo.propuesta.id}`} className="inline-flex items-center rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red">
                    Ver propuesta
                  </Link>
                </td>
              </tr>
            ) : propuestas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="font-bold text-gray-700">Aún no has creado ninguna propuesta.</p>
                  <p className="mt-0.5 text-xs text-muted">Usa el botón para crear la primera.</p>
                </td>
              </tr>
            ) : (
              propuestas.map((p, i) => {
                const e = estadoFila(p, hayEnviada && p.id !== idActiva);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <td className="px-6 py-4 font-bold text-brand-red">#{i + 1}</td>
                    <td className="px-6 py-4">
                      <span className="block max-w-[320px] truncate text-gray-800" title={p.titulo ?? ""}>
                        {p.titulo || "Sin título"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{MODALIDAD[p.tipo] ?? p.tipo}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${TONO[e.tono]}`}>{e.texto}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Accion p={p} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
