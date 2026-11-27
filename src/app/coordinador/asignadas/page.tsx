import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getPropuestasAsignadasCoordinador } from "@/app/actions/coordinador";
import FiltrosListado from "@/components/coordinador/FiltrosListado";
import Paginacion, { paginar } from "@/components/Paginacion";
import { NOMBRE_MODALIDAD, TAMANO_PAGINA, coincideTexto, hrefConFiltros, leerFiltros } from "@/lib/filtrosListado";
import { nombreEstado } from "@/lib/historialEstados";
import { fechaCortaSV } from "@/lib/fechasTexto";
import EncabezadoCoordinacion from "@/components/coordinador/EncabezadoCoordinacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis propuestas asignadas | Coordinación" };

type Fila = {
  id: number;
  numero: number;
  tipo: string;
  titulo: string;
  asesorNombre: string;
  estudiantes: string;
  fechaInicio: string;
  fechaFin: string;
  estado?: string;
  carrera?: string;
};

const fechaODash = (t: string) => (/^\d{4}-\d{2}-\d{2}/.test(t) ? fechaCortaSV(t.slice(0, 10)) : "—");

/** D3 (specs/COORDINADOR_ASIGNACION.md): propuestas de la coordinación que ya tienen asesor. */
export default async function AsignadasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) redirect("/login");

  const filtros = leerFiltros(await searchParams);
  const res = await getPropuestasAsignadasCoordinador();
  const todas: Fila[] = res?.success && Array.isArray(res.data) ? (res.data as Fila[]) : [];
  const carreras = [...new Set(todas.map((f) => f.carrera ?? "Sin carrera"))].sort((a, b) => a.localeCompare(b, "es"));
  const estados = [...new Set(todas.map((f) => f.estado ?? ""))].filter(Boolean).map((e) => ({ valor: e, texto: nombreEstado(e) }));

  const filtradas = todas.filter(
    (f) =>
      coincideTexto(filtros.q, f.titulo, f.estudiantes, f.asesorNombre, f.numero) &&
      (!filtros.modalidad || f.tipo === filtros.modalidad) &&
      (!filtros.carrera || (f.carrera ?? "Sin carrera") === filtros.carrera) &&
      (!filtros.estado || f.estado === filtros.estado),
  );
  const { items, paginaActual, totalPaginas } = paginar(filtradas, filtros.pagina, TAMANO_PAGINA);

  return (
    <div className="space-y-6">
      <EncabezadoCoordinacion titulo="Mis propuestas asignadas">
        Propuestas de tu coordinación que ya tienen asesor, con su estado y fechas.
      </EncabezadoCoordinacion>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <FiltrosListado
          base="/coordinador/asignadas"
          filtros={filtros}
          placeholder="Buscar por título, egresado o asesor"
          modalidades={Object.entries(NOMBRE_MODALIDAD).map(([valor, texto]) => ({ valor, texto }))}
          carreras={carreras.map((c) => ({ valor: c, texto: c }))}
          estados={estados}
        />

        {todas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-gray-50 py-10 text-center text-sm text-gray-600">Todavía no tienes propuestas con asesor.</p>
        ) : filtradas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-gray-50 py-10 text-center text-sm text-gray-600">Ninguna propuesta coincide con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-border bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-3 py-2.5">Propuesta</th>
                  <th className="px-3 py-2.5">Egresados</th>
                  <th className="px-3 py-2.5">Asesor</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Inicio</th>
                  <th className="px-3 py-2.5">Fin</th>
                  <th className="px-3 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((f) => (
                  <tr key={f.id} className="align-top hover:bg-gray-50/60">
                    <td className="max-w-[22rem] px-3 py-3">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        {NOMBRE_MODALIDAD[f.tipo] ?? f.tipo} · N.º {f.numero}
                      </span>
                      <span className="block font-semibold text-gray-900">{f.titulo}</span>
                    </td>
                    <td className="max-w-[16rem] px-3 py-3">
                      <span className="block text-gray-900">{f.estudiantes}</span>
                      <span className="block text-[11px] text-gray-500">{f.carrera ?? "Sin carrera"}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-900">{f.asesorNombre}</td>
                    <td className="px-3 py-3 text-xs text-gray-800">{nombreEstado(f.estado)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-700">{fechaODash(f.fechaInicio)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-700">{fechaODash(f.fechaFin)}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/coordinador/propuestas/${f.id}`} className="inline-block whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50">
                        Ver propuesta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Paginacion
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          totalElementos={filtradas.length}
          tamanoPagina={TAMANO_PAGINA}
          construirHref={(p) => hrefConFiltros("/coordinador/asignadas", filtros, p)}
        />
      </section>
    </div>
  );
}
