import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSeguimientoAsesor } from "@/app/actions/registrosActividad";
import { getSolicitudesCambioAsesor } from "@/app/actions/cambiosActividad";
import { getInformesMensualesAsesor } from "@/app/actions/informesMensuales";
import { getNotasSeguimiento } from "@/app/actions/comentariosAsesor";
import { getInformeVisita } from "@/app/actions/informeVisita";
import { formatearFechaLarga } from "@/lib/periodosPasantia";
import Paginacion, { paginar } from "@/components/Paginacion";
import SolicitudesCambioAsesor from "./SolicitudesCambioAsesor";
import NotasSeguimiento from "./NotasSeguimiento";

const TAMANO_PAGINA = 10;

const ESTADO_ACTIVIDAD: Record<string, { label: string; badge: string }> = {
  pendiente: { label: "Sin registrar", badge: "bg-slate-50 text-slate-500 border-slate-200" },
  guardado: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Por revisar", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con observaciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobada", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  redactando: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Por revisar", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

type Vista = "revisar" | "observadas" | "todas";

function formatFecha(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "America/El_Salvador", year: "numeric", month: "short", day: "numeric" });
}

export default async function SeguimientoAsesorPage({
  params,
  searchParams,
}: {
  params: Promise<{ propuestaId: string }>;
  searchParams: Promise<{ vista?: string; pagina?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const { propuestaId } = await params;
  const id = Number(propuestaId);
  if (!Number.isFinite(id)) notFound();

  const sp = await searchParams;
  const vista: Vista = sp.vista === "observadas" || sp.vista === "todas" ? sp.vista : "revisar";
  const pagina = Number(sp.pagina) || 1;

  const res = await getSeguimientoAsesor(id);
  if (!res.success || !res.grupos) {
    return (
      <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el seguimiento de actividades."}
      </div>
    );
  }

  const [solicitudesRes, informesRes, notasRes, visitaRes] = await Promise.all([
    getSolicitudesCambioAsesor(id),
    getInformesMensualesAsesor(id),
    getNotasSeguimiento(id),
    getInformeVisita(id),
  ]);
  const notas = notasRes.success && notasRes.notas ? notasRes.notas.map((n) => ({ periodo: n.periodo, semana: n.semana, nota: n.nota })) : [];
  const visitaCompletada = visitaRes.success && visitaRes.visita?.estado === "completado";
  const ventanaVisita = visitaRes.success ? visitaRes.ventanaVisita : null;
  const solicitudes = solicitudesRes.success && solicitudesRes.solicitudes ? solicitudesRes.solicitudes : [];
  const informesMensualesList = informesRes.success && informesRes.informes ? informesRes.informes : [];

  const todas = res.grupos.flatMap((g) =>
    g.actividades.map((a) => ({ ...a, periodo: g.periodo, semana: g.semana, estadoGrupo: g.estadoGrupo }))
  );
  const porRevisar = todas.filter((a) => a.registro?.estado === "enviado");
  const observadas = todas.filter((a) => a.registro?.estado === "observado");
  const grupoActual = res.grupos.find((g) => g.estadoGrupo === "habilitada" || g.estadoGrupo === "en_revision");

  const listas: Record<Vista, typeof todas> = { revisar: porRevisar, observadas, todas };
  const lista = listas[vista];
  const paginada = paginar(lista, pagina, TAMANO_PAGINA);
  const hrefVista = (v: Vista, p?: number) => `/asesor/seguimiento/${id}?vista=${v}${p && p > 1 ? `&pagina=${p}` : ""}`;

  const pestanas: { id: Vista; label: string; total: number }[] = [
    { id: "revisar", label: "Por revisar", total: porRevisar.length },
    { id: "observadas", label: "Con observaciones", total: observadas.length },
    { id: "todas", label: "Todas", total: todas.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-card-dark">Seguimiento de actividades</h1>
          <p className="text-xs text-muted mt-1 font-semibold">
            {res.egresado?.nombreCompleto} ({res.egresado?.carnet}) — Pasantía como Trabajo de Graduación
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/asesor/seguimiento/${id}/bitacora`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors w-fit"
          >
            Bitácora del proceso
          </Link>
          <Link
            href="/asesor"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
          >
            Volver al panel
          </Link>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Ubicación del estudiante</span>
            <span className="text-sm font-extrabold text-card-dark">
              {grupoActual ? `Mes ${grupoActual.periodo}, Semana ${grupoActual.semana}` : "Cronograma completado"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Pendientes de revisión</span>
            <span className="text-sm font-extrabold text-card-dark">{res.pendientesRevision} actividades</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Avance general</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-red rounded-full" style={{ width: `${res.porcentajeAvance}%` }} />
              </div>
              <span className="text-xs font-extrabold text-slate-700">{res.porcentajeAvance}%</span>
            </div>
            <span className="block text-[11px] text-muted font-semibold mt-0.5">
              {res.completadas} de {res.totalActividades} actividades enviadas
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-card-dark">Informes del período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {informesMensualesList.map((im) => {
            const estado = ESTADO_INFORME[im.estado] || ESTADO_INFORME.redactando;
            return (
              <div key={im.id} className="p-4 bg-slate-50 border border-border rounded-xl flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">Informe #{im.numero}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border text-center ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>
                <div className="text-[11px] text-muted font-semibold space-y-0.5">
                  <p>Fecha límite: {formatearFechaLarga(im.fechaLimite)}</p>
                  {im.enviadoEn && <p>Enviado: {formatFecha(im.enviadoEn)}</p>}
                  {im.cumplimiento && <p>{im.cumplimiento === "a_tiempo" ? "Entregado a tiempo" : "Entregado fuera de tiempo"}</p>}
                </div>
                <div className="mt-auto flex flex-col gap-1.5 pt-1">
                  {im.estado !== "redactando" && (
                    <Link
                      href={`/asesor/seguimiento/${id}/informe/${im.id}`}
                      className={`text-center px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                        im.estado === "enviado"
                          ? "bg-brand-red hover:bg-brand-red-hover text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {im.estado === "aprobado" ? "Ver comentarios" : "Agregar comentarios del asesor"}
                    </Link>
                  )}
                  <Link
                    href={`/informes/${im.id}/imprimir`}
                    target="_blank"
                    className="text-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-[11px] font-bold"
                  >
                    Ver documento
                  </Link>
                </div>

                {/* El informe del tercer período incluye la visita del asesor a la empresa */}
                {im.numero === 3 && (
                  <div className="pt-2 mt-1 border-t border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-slate-700">Informe de visita</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          visitaCompletada ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-300"
                        }`}
                      >
                        {visitaCompletada ? "Completado" : "Pendiente"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted font-semibold">
                      Requisito para aprobar este informe.
                      {ventanaVisita &&
                        ` Visitas de la cohorte: del ${formatearFechaLarga(ventanaVisita.inicio)} al ${formatearFechaLarga(ventanaVisita.fin)}.`}
                    </p>
                    <Link
                      href={`/asesor/seguimiento/${id}/visita`}
                      className="block text-center px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold"
                    >
                      {visitaCompletada ? "Ver o actualizar informe de visita" : "Registrar informe de visita"}
                    </Link>
                    {visitaCompletada && (
                      <Link
                        href={`/informes/visita/${id}`}
                        target="_blank"
                        className="block text-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-[11px] font-bold"
                      >
                        Ver documento de visita
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <NotasSeguimiento
        propuestaId={id}
        semanaActual={grupoActual ? { periodo: grupoActual.periodo, semana: grupoActual.semana } : null}
        notas={notas}
      />

      <SolicitudesCambioAsesor solicitudes={solicitudes} />

      <div className="bg-white border border-border rounded-2xl shadow-sm">
        <div className="px-5 pt-5">
          <h2 className="text-sm font-extrabold text-card-dark">Actividades registradas</h2>
        </div>
        <div className="flex gap-1 px-5 mt-4 border-b border-slate-200" role="tablist">
          {pestanas.map((p) => (
            <Link
              key={p.id}
              href={hrefVista(p.id)}
              scroll={false}
              role="tab"
              aria-selected={vista === p.id}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                vista === p.id ? "border-brand-red text-brand-red" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${
                  vista === p.id ? "bg-red-50 text-brand-red" : "bg-slate-100 text-slate-500"
                }`}
              >
                {p.total}
              </span>
            </Link>
          ))}
        </div>

        <div className="p-5 space-y-3">
          {paginada.items.length === 0 ? (
            <p className="text-xs text-muted font-semibold">
              {vista === "revisar"
                ? "No hay actividades pendientes de revisión."
                : vista === "observadas"
                  ? "No hay actividades con observaciones pendientes de corregir."
                  : "No hay actividades en el cronograma."}
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Actividad</th>
                    <th className="py-2.5 px-3">Mes / Semana</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Enviada</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginada.items.map((a) => {
                    const estado = a.registro?.estado || "pendiente";
                    const info = ESTADO_ACTIVIDAD[estado] || ESTADO_ACTIVIDAD.pendiente;
                    const revisable = estado !== "pendiente" && estado !== "guardado";
                    return (
                      <tr key={a.id} className={!revisable ? "text-slate-400" : ""}>
                        <td className="py-2.5 px-3 font-mono font-bold">{a.codigo}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{a.titulo}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          Mes {a.periodo}, Semana {a.semana}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>
                            {a.estadoGrupo === "bloqueada" && estado === "pendiente" ? "Bloqueada" : info.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">{formatFecha(a.registro?.enviadoEn)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {revisable ? (
                            <Link
                              href={`/asesor/seguimiento/${id}/actividad/${a.id}`}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                                estado === "enviado"
                                  ? "bg-brand-red hover:bg-brand-red-hover text-white"
                                  : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {estado === "enviado" ? "Revisar" : "Ver"}
                            </Link>
                          ) : (
                            <span className="text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Paginacion
            paginaActual={paginada.paginaActual}
            totalPaginas={paginada.totalPaginas}
            totalElementos={lista.length}
            tamanoPagina={TAMANO_PAGINA}
            construirHref={(p) => hrefVista(vista, p)}
          />
        </div>
      </div>
    </div>
  );
}
