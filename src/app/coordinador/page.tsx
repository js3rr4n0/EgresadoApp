import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getPropuestasPendientesCoordinador } from "@/app/actions/coordinador";
import FiltrosListado from "@/components/coordinador/FiltrosListado";
import AsignarAsesor from "@/components/coordinador/AsignarAsesor";
import RechazarPropuesta from "@/components/revisarPropuesta/RechazarPropuesta";
import Paginacion, { paginar } from "@/components/Paginacion";
import { NOMBRE_MODALIDAD, TAMANO_PAGINA, coincideTexto, hrefConFiltros, leerFiltros } from "@/lib/filtrosListado";
import { fechaCortaSV } from "@/lib/fechasTexto";
import EncabezadoCoordinacion from "@/components/coordinador/EncabezadoCoordinacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Por revisar y asignar | Coordinación" };

type Fila = {
  id: number;
  numero: number;
  tipo: string;
  titulo: string;
  fechaAprobacion: Date | string | null;
  estudiantes: string;
  carrera: string;
  requisitosFaltan?: string[];
  integrantes?: { id: number; nombre: string }[];
  solicitudActual: { asesorNombre: string; estado: string; justificacionRechazo: string | null } | null;
};

/** Estado de la solicitud de asesoría, para filtrar y mostrar. */
const estadoAsesoria = (f: Fila) => (!f.solicitudActual ? "sin_enviar" : f.solicitudActual.estado === "pendiente" ? "esperando" : f.solicitudActual.estado === "rechazada" ? "rechazada" : "otra");

const ESTADOS = [
  { valor: "sin_enviar", texto: "Sin asesor solicitado" },
  { valor: "esperando", texto: "Esperando respuesta del asesor" },
  { valor: "rechazada", texto: "Rechazada por el asesor" },
  { valor: "incompletos", texto: "Requisitos incompletos" },
];

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

/**
 * D3 (specs/COORDINADOR_ASIGNACION.md): propuestas que la administración asignó al coordinador y todavía no tienen
 * asesor. Revisar, asignar asesor o rechazar por requisitos.
 */
export default async function PorAsignarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) redirect("/login");

  const filtros = leerFiltros(await searchParams);
  const res = await getPropuestasPendientesCoordinador();
  const todas: Fila[] = res?.success && Array.isArray(res.data) ? (res.data as Fila[]) : [];
  const carreras = [...new Set(todas.map((f) => f.carrera))].sort((a, b) => a.localeCompare(b, "es"));

  const filtradas = todas.filter(
    (f) =>
      coincideTexto(filtros.q, f.titulo, f.estudiantes, f.numero) &&
      (!filtros.modalidad || f.tipo === filtros.modalidad) &&
      (!filtros.carrera || f.carrera === filtros.carrera) &&
      (!filtros.estado || (filtros.estado === "incompletos" ? (f.requisitosFaltan?.length ?? 0) > 0 : estadoAsesoria(f) === filtros.estado)),
  );
  const { items, paginaActual, totalPaginas } = paginar(filtradas, filtros.pagina, TAMANO_PAGINA);

  return (
    <div className="space-y-6">
      <EncabezadoCoordinacion titulo="Por revisar y asignar">
        Propuestas que la administración te asignó. El sistema y la administración ya verificaron la empresa, la fortaleza, los actores, la carta y las firmas; revisa el documento y asigna el asesor.
      </EncabezadoCoordinacion>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <FiltrosListado
          base="/coordinador"
          filtros={filtros}
          modalidades={Object.entries(NOMBRE_MODALIDAD).map(([valor, texto]) => ({ valor, texto }))}
          carreras={carreras.map((c) => ({ valor: c, texto: c }))}
          estados={ESTADOS}
        />

        {todas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-gray-50 py-10 text-center text-sm text-gray-600">
            No tienes propuestas por asignar. Cuando la administración te asigne una, aparecerá aquí.
          </p>
        ) : filtradas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-gray-50 py-10 text-center text-sm text-gray-600">Ninguna propuesta coincide con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-border bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-3 py-2.5">Recibida</th>
                  <th className="px-3 py-2.5">Propuesta</th>
                  <th className="px-3 py-2.5">Egresados</th>
                  <th className="px-3 py-2.5">Asesoría</th>
                  <th className="px-3 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((f) => {
                  const faltan = f.requisitosFaltan ?? [];
                  const fecha = iso(f.fechaAprobacion);
                  const estado = estadoAsesoria(f);
                  return (
                    <tr key={f.id} className="align-top hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-3 py-3 text-gray-700">{fecha ? fechaCortaSV(fecha) : "—"}</td>
                      <td className="max-w-[22rem] px-3 py-3">
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          {NOMBRE_MODALIDAD[f.tipo] ?? f.tipo} · N.º {f.numero}
                        </span>
                        <span className="block font-semibold text-gray-900">{f.titulo}</span>
                        {faltan.length > 0 && (
                          <span className="mt-1 block text-[11px] text-red-800">
                            <span className="font-bold">Requisitos incompletos:</span> {faltan.join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[16rem] px-3 py-3">
                        <span className="block text-gray-900">{f.estudiantes}</span>
                        <span className="block text-[11px] text-gray-500">{f.carrera}</span>
                      </td>
                      <td className="max-w-[16rem] px-3 py-3 text-xs">
                        {estado === "sin_enviar" && <span className="text-gray-600">Sin asesor solicitado</span>}
                        {estado === "esperando" && (
                          <span className="text-gray-800">
                            Esperando respuesta de <span className="font-semibold">{f.solicitudActual!.asesorNombre}</span>
                          </span>
                        )}
                        {estado === "rechazada" && (
                          <span className="block">
                            <span className="font-semibold text-red-800">Rechazada por {f.solicitudActual!.asesorNombre}</span>
                            {f.solicitudActual!.justificacionRechazo && <span className="mt-0.5 block text-gray-600">Motivo: {f.solicitudActual!.justificacionRechazo}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/coordinador/propuestas/${f.id}`} className="inline-block whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50">
                            Revisar
                          </Link>
                          {faltan.length === 0 && (estado === "sin_enviar" || estado === "rechazada") && (
                            <AsignarAsesor
                              propuestaId={f.id}
                              titulo={f.titulo}
                              egresados={f.estudiantes}
                              textoBoton={estado === "rechazada" ? "Elegir otro asesor" : "Asignar asesor"}
                            />
                          )}
                          {estado !== "esperando" && (
                            <RechazarPropuesta
                              propuestaId={f.id}
                              numero={f.numero}
                              integrantes={f.integrantes ?? []}
                              textoBoton="Rechazar"
                              claseBoton="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-50"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Paginacion
          paginaActual={paginaActual}
          totalPaginas={totalPaginas}
          totalElementos={filtradas.length}
          tamanoPagina={TAMANO_PAGINA}
          construirHref={(p) => hrefConFiltros("/coordinador", filtros, p)}
        />
      </section>
    </div>
  );
}
