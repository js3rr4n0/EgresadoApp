import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSeguimientoAsesor } from "@/app/actions/registrosActividad";
import { getSolicitudesCambioAsesor } from "@/app/actions/cambiosActividad";
import { getInformesMensualesAsesor } from "@/app/actions/informesMensuales";
import { getNotasSeguimiento } from "@/app/actions/comentariosAsesor";
import { getInformeVisita } from "@/app/actions/informeVisita";
import { formatearFechaLarga, hoyISOElSalvador, nombreCortoInforme } from "@/lib/periodosPasantia";
import { cuentaRegresivaVisita } from "@/lib/formularioVisita";
import { leerNotaSemanal } from "@/lib/comentariosAsesor";
import CuentaRegresivaVisita from "@/components/CuentaRegresivaVisita";
import { getPeriodosPropuesta } from "@/lib/habilitacionActividades";
import Paginacion, { paginar } from "@/components/Paginacion";
import SolicitudesCambioAsesor from "./SolicitudesCambioAsesor";
import NotasSeguimiento from "./NotasSeguimiento";

const TAMANO_PAGINA = 10;

const ESTADO_SEMANA: Record<string, { label: string; badge: string }> = {
  en_redaccion: { label: "En redacción", badge: "bg-slate-100 text-slate-600 border-slate-300" },
  por_revisar: { label: "Por revisar", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  en_correccion: { label: "En corrección", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobada: { label: "Aprobada", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  redactando: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Por revisar", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

type Vista = "revisar" | "correccion" | "todas";

/** Días transcurridos desde el envío de una semana. */
function diasEsperando(d: Date | null) {
  return d ? Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)) : 0;
}

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
  const vista: Vista = sp.vista === "correccion" || sp.vista === "todas" ? sp.vista : "revisar";
  const pagina = Number(sp.pagina) || 1;

  const res = await getSeguimientoAsesor(id);
  if (!res.success || !res.grupos) {
    return (
      <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el seguimiento de actividades."}
      </div>
    );
  }

  const [solicitudesRes, informesRes, notasRes, visitaRes, periodosProp] = await Promise.all([
    getSolicitudesCambioAsesor(id),
    getInformesMensualesAsesor(id),
    getNotasSeguimiento(id),
    getInformeVisita(id),
    getPeriodosPropuesta(id),
  ]);
  const notas =
    notasRes.success && notasRes.notas
      ? notasRes.notas.map((n) => ({ periodo: n.periodo, ...leerNotaSemanal(n.semana, n.respuestas, n.nota) }))
      : [];
  const visitaCompletada = visitaRes.success && visitaRes.visita?.estado === "completado";
  const ventanaVisita = visitaRes.success ? visitaRes.ventanaVisita : null;
  const cuentaVisita = cuentaRegresivaVisita(ventanaVisita?.inicioPasantia ?? null, hoyISOElSalvador(), visitaCompletada);
  const solicitudes = solicitudesRes.success && solicitudesRes.solicitudes ? solicitudesRes.solicitudes : [];
  const informesMensualesList = informesRes.success && informesRes.informes ? informesRes.informes : [];

  // La revisión es por semana: cada fila es una semana del cronograma con todas sus actividades.
  const todas = res.grupos.map((g) => {
    const envios = g.actividades.map((a) => a.registro?.enviadoEn).filter((d): d is Date => !!d);
    return {
      clave: `${g.periodo}.${g.semana}`,
      periodo: g.periodo,
      semana: g.semana,
      estadoSemana: g.estadoSemana,
      total: g.actividades.length,
      aprobadas: g.actividades.filter((a) => a.registro?.estado === "aprobado").length,
      conContenido: g.actividades.filter((a) => a.registro?.estado && a.registro.estado !== "pendiente").length,
      enviadaEn: envios.length ? new Date(Math.max(...envios.map((d) => new Date(d).getTime()))) : null,
      actividades: g.actividades.map((a) => ({ id: a.id, codigo: a.codigo, titulo: a.titulo, estado: a.registro?.estado || "pendiente" })),
    };
  });
  // Plazo de revisión: se espera que el asesor revise cada semana enviada en un máximo de 3 días.
  const DIAS_PLAZO_REVISION = 3;

  const porRevisar = todas.filter((g) => g.estadoSemana === "por_revisar");
  const enCorreccion = todas.filter((g) => g.estadoSemana === "en_correccion");
  const grupoActual = res.grupos.find((g) => g.estadoGrupo === "habilitada" || g.estadoGrupo === "en_revision");

  const listas: Record<Vista, typeof todas> = { revisar: porRevisar, correccion: enCorreccion, todas };
  const lista = listas[vista];
  const paginada = paginar(lista, pagina, TAMANO_PAGINA);
  const hrefVista = (v: Vista, p?: number) => `/asesor/seguimiento/${id}?vista=${v}${p && p > 1 ? `&pagina=${p}` : ""}`;

  const pestanas: { id: Vista; label: string; total: number }[] = [
    { id: "revisar", label: "Por revisar", total: porRevisar.length },
    { id: "correccion", label: "En corrección", total: enCorreccion.length },
    { id: "todas", label: "Todas las semanas", total: todas.length },
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

      {/* Resumen del estudiante y bandeja de revisión: semanas enviadas que esperan la aprobación del asesor */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Ubicación del estudiante</span>
            <span className="text-sm font-extrabold text-card-dark">
              {grupoActual ? `Período ${grupoActual.periodo}, Semana ${grupoActual.semana}` : "Cronograma completado"}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Pendientes de revisión</span>
            <span className="text-sm font-extrabold text-card-dark">{res.pendientesRevision} semana{res.pendientesRevision === 1 ? "" : "s"}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Avance general</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-unicaes rounded-full" style={{ width: `${res.porcentajeAvance}%` }} />
              </div>
              <span className="text-xs font-extrabold text-slate-700">{res.porcentajeAvance}%</span>
            </div>
            <span className="block text-[11px] text-muted font-semibold mt-0.5">
              {res.completadas} de {res.totalActividades} actividades enviadas
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-card-dark">Bandeja de revisión</h2>
            <p className="text-[11px] text-muted font-semibold mt-0.5">
              Semanas enviadas por el estudiante que esperan su revisión. Se recomienda revisarlas en un máximo de {DIAS_PLAZO_REVISION} días
              para no detener su avance.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 ${
              porRevisar.length > 0 ? "bg-red-50 text-unicaes border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {porRevisar.length > 0 ? `${porRevisar.length} por revisar` : "Al día"}
          </span>
        </div>

        {porRevisar.length === 0 ? (
          <p className="text-xs text-muted font-semibold">No hay semanas pendientes de revisión.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {porRevisar.map((g) => {
              const dias = diasEsperando(g.enviadaEn);
              const atrasada = dias > DIAS_PLAZO_REVISION;
              return (
                <div
                  key={g.clave}
                  className={`rounded-xl border p-4 space-y-3 ${atrasada ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        Período {g.periodo}, Semana {g.semana}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        {g.total} actividad{g.total === 1 ? "" : "es"} · enviada el {formatFecha(g.enviadaEn)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
                        atrasada ? "bg-red-100 text-red-800 border-red-300" : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {dias === 0 ? "Enviada hoy" : `Esperando ${dias} día${dias === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {g.actividades.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono font-bold text-unicaes shrink-0">{a.codigo}</span>
                        <Link
                          href={`/asesor/seguimiento/${id}/semana/${g.periodo}/${g.semana}?actividad=${a.id}`}
                          className="font-semibold text-slate-700 hover:text-unicaes hover:underline truncate"
                        >
                          {a.titulo}
                        </Link>
                        {a.estado === "aprobado" && <span className="text-[9px] font-extrabold uppercase text-emerald-700 shrink-0">Aprobada</span>}
                      </li>
                    ))}
                  </ul>
                  {atrasada && (
                    <p className="text-[11px] text-red-800 font-semibold">Supera el plazo recomendado de {DIAS_PLAZO_REVISION} días.</p>
                  )}
                  <Link
                    href={`/asesor/seguimiento/${id}/semana/${g.periodo}/${g.semana}`}
                    className="block text-center px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold transition-colors"
                  >
                    Revisar semana
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {enCorreccion.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Devueltas al estudiante (solo lectura)</p>
            <div className="flex flex-wrap gap-2">
              {enCorreccion.map((g) => (
                <Link
                  key={g.clave}
                  href={`/asesor/seguimiento/${id}/semana/${g.periodo}/${g.semana}`}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                >
                  Período {g.periodo}, Semana {g.semana} · en corrección
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-extrabold text-card-dark">Informes del período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {informesMensualesList.map((im) => {
            const estado = ESTADO_INFORME[im.estado] || ESTADO_INFORME.redactando;
            return (
              <div
                key={im.id}
                className={`p-4 bg-slate-50 border rounded-xl flex flex-col gap-2 ${
                  grupoActual?.periodo === im.numero ? "border-unicaes ring-1 ring-unicaes/30" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">{nombreCortoInforme(im.numero)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border text-center ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>
                <div className="text-[11px] text-muted font-semibold space-y-0.5">
                  <p>Entrega: {formatearFechaLarga(periodosProp.find((p) => p.num === im.numero)?.fin ?? im.fechaLimite)}</p>
                  {im.enviadoEn && <p>Enviado: {formatFecha(im.enviadoEn)}</p>}
                  {im.cumplimiento && <p>{im.cumplimiento === "a_tiempo" ? "Entregado a tiempo" : "Entregado fuera de tiempo"}</p>}
                </div>
                {/* El Informe #3 requiere la visita del asesor: el detalle está en el bloque de visita, debajo */}
                {im.numero === 3 && (
                  <a
                    href="#informe-visita"
                    className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold w-fit ${
                      visitaCompletada
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : cuentaVisita && (cuentaVisita.estado !== "faltan" || cuentaVisita.dias <= 14)
                          ? "bg-amber-50 text-amber-900 border-amber-300"
                          : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {visitaCompletada
                      ? "Visita completada"
                      : cuentaVisita?.estado === "vencida"
                        ? "Visita vencida"
                        : cuentaVisita?.estado === "en_curso"
                          ? "Visita en período"
                          : cuentaVisita
                            ? `Visita en ${cuentaVisita.dias} días`
                            : "Requiere visita"}
                  </a>
                )}
                <div className="mt-auto flex flex-col gap-1.5 pt-1">
                  {/* Los comentarios pueden registrarse en cualquier momento del período, antes de aprobar el informe */}
                  <Link
                    href={`/asesor/seguimiento/${id}/informe/${im.id}`}
                    className={`text-center px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                      im.estado === "aprobado" ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-unicaes hover:bg-unicaes-hover text-white"
                    }`}
                  >
                    {im.estado === "aprobado" ? "Ver comentarios del asesor" : "Añadir comentarios del asesor"}
                  </Link>
                  <Link
                    href={`/informes/${im.id}/imprimir`}
                    target="_blank"
                    className="text-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-[11px] font-bold"
                  >
                    {im.estado === "aprobado" ? "Ver documento aprobado" : "Ver avance del documento"}
                  </Link>
                </div>

              </div>
            );
          })}
        </div>

        {/* Informe de visita: requisito para aprobar el Informe #3 */}
        <div
          id="informe-visita"
          className="scroll-mt-6 grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-4 items-center p-4 rounded-xl border border-border bg-slate-50"
        >
          {cuentaVisita ? (
            <CuentaRegresivaVisita cuenta={cuentaVisita} />
          ) : (
            <p className="text-[11px] text-muted font-semibold">Sin fecha de inicio de la pasantía para calcular la visita.</p>
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-800">Informe de visita</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  visitaCompletada ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-300"
                }`}
              >
                {visitaCompletada ? "Completado" : "Pendiente"}
              </span>
            </div>
            <p className="text-[11px] text-muted font-semibold">
              Requisito para aprobar el Informe #3. Incluye el formulario institucional y las fotografías de la visita a la empresa.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 md:w-56">
            <Link
              href={`/asesor/seguimiento/${id}/visita`}
              className="text-center px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold"
            >
              {visitaCompletada ? "Ver o actualizar informe de visita" : "Registrar informe de visita"}
            </Link>
            {visitaCompletada && (
              <Link
                href={`/informes/visita/${id}`}
                target="_blank"
                className="text-center px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-[11px] font-bold"
              >
                Ver documento de visita
              </Link>
            )}
          </div>
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
          <h2 className="text-sm font-extrabold text-card-dark">Semanas de actividades</h2>
          <p className="text-[11px] text-muted font-semibold mt-0.5">
            El estudiante envía cada semana completa. Ábrala para revisar todas sus actividades y aprobarla o devolverla con
            observaciones. También puede ver el borrador de las semanas que aún no envía.
          </p>
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
                vista === p.id ? "border-unicaes text-unicaes" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${
                  vista === p.id ? "bg-red-50 text-unicaes" : "bg-slate-100 text-slate-500"
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
                ? "No hay semanas pendientes de revisión."
                : vista === "correccion"
                  ? "No hay semanas devueltas pendientes de corregir."
                  : "No hay actividades en el cronograma."}
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-2.5 px-3">Semana</th>
                    <th className="py-2.5 px-3">Actividades</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Enviada</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginada.items.map((g) => {
                    const info = ESTADO_SEMANA[g.estadoSemana] || ESTADO_SEMANA.en_redaccion;
                    const esActual = grupoActual?.periodo === g.periodo && grupoActual?.semana === g.semana;
                    const sinAvance = g.estadoSemana === "en_redaccion" && g.conContenido === 0;
                    return (
                      <tr key={g.clave} className={sinAvance ? "text-slate-400" : ""}>
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                          Período {g.periodo}, Semana {g.semana}
                          {esActual && <span className="ml-2 text-[9px] font-extrabold uppercase text-slate-500">actual</span>}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] font-semibold">
                          {g.estadoSemana === "en_redaccion"
                            ? `${g.conContenido} de ${g.total} con borrador`
                            : `${g.aprobadas} de ${g.total} aprobadas`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>
                            {info.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">{formatFecha(g.enviadaEn)}</td>
                        <td className="py-2.5 px-3 text-right">
                          {sinAvance ? (
                            <span className="text-[11px]">—</span>
                          ) : (
                            <Link
                              href={`/asesor/seguimiento/${id}/semana/${g.periodo}/${g.semana}`}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${
                                g.estadoSemana === "por_revisar"
                                  ? "bg-unicaes hover:bg-unicaes-hover text-white"
                                  : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {g.estadoSemana === "por_revisar"
                                ? "Revisar semana"
                                : g.estadoSemana === "en_redaccion"
                                  ? "Ver borrador"
                                  : "Ver semana"}
                            </Link>
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
