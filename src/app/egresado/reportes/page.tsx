import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSeguimientoEgresado } from "@/app/actions/registrosActividad";
import { getSolicitudesCambioEgresado, getOpcionesDestinoCambio } from "@/app/actions/cambiosActividad";
import { verificarCierrePeriodo, getInformesMensuales } from "@/app/actions/informesMensuales";
import { contarPalabras, getPeriodosPropuesta, DESCRIPTOR_MIN_PALABRAS, DESCRIPTOR_MAX_PALABRAS } from "@/lib/habilitacionActividades";
import { formatearFechaLarga } from "@/lib/periodosPasantia";
import Paginacion, { paginar } from "@/components/Paginacion";
import SolicitudesCambioActividad from "./SolicitudesCambioActividad";

const TAMANO_PAGINA = 8;

const ESTADO_ACTIVIDAD: Record<string, { label: string; badge: string; accion: string }> = {
  pendiente: { label: "Sin registrar", badge: "bg-slate-100 text-slate-600 border-slate-300", accion: "Registrar" },
  guardado: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300", accion: "Continuar" },
  enviado: { label: "Enviada", badge: "bg-blue-50 text-blue-800 border-blue-200", accion: "Ver" },
  observado: { label: "Con observaciones", badge: "bg-amber-50 text-amber-900 border-amber-300", accion: "Corregir" },
  aprobado: { label: "Aprobada", badge: "bg-emerald-50 text-emerald-800 border-emerald-200", accion: "Ver" },
};

const ESTADO_INFORME: Record<string, { label: string; badge: string }> = {
  redactando: { label: "Borrador", badge: "bg-slate-100 text-slate-700 border-slate-300" },
  enviado: { label: "Enviado, en revisión", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  observado: { label: "Con correcciones", badge: "bg-amber-50 text-amber-900 border-amber-300" },
  aprobado: { label: "Aprobado", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

type Vista = "actual" | "proximas" | "completadas";

function formatFecha(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-SV", { timeZone: "America/El_Salvador", year: "numeric", month: "short", day: "numeric" });
}

export default async function SeguimientoEgresadoPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; pagina?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  const params = await searchParams;
  const vista: Vista = params.vista === "proximas" || params.vista === "completadas" ? params.vista : "actual";
  const pagina = Number(params.pagina) || 1;

  const [propuestaActiva] = await db
    .select()
    .from(propuestas)
    .where(
      and(eq(propuestas.egresadoId, session.userId), eq(propuestas.tipo, "pasantia"), eq(propuestas.estado, "en_ejecucion"))
    )
    .limit(1);

  const encabezado = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Seguimiento de Actividades e Informes Mensuales</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Pasantía como Trabajo de Graduación</p>
      </div>
      <Link
        href="/egresado"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
      >
        Volver al panel principal
      </Link>
    </div>
  );

  if (!propuestaActiva) {
    return (
      <div className="space-y-6">
        {encabezado}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 text-center shadow-sm max-w-3xl mx-auto space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900">Este módulo aún no está disponible</h2>
          <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-xl mx-auto font-medium">
            El seguimiento de actividades se habilita cuando su propuesta de <strong>Pasantía</strong> se encuentra oficialmente
            <strong> en ejecución</strong>.
          </p>
        </div>
      </div>
    );
  }

  const res = await getSeguimientoEgresado(propuestaActiva.id);
  if (!res.success || !res.grupos) {
    return (
      <div className="space-y-6">
        {encabezado}
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
          {res.error || "No se pudo cargar el seguimiento de actividades."}
        </div>
      </div>
    );
  }

  const [solicitudesRes, opcionesRes, informesRes, periodosProp] = await Promise.all([
    getSolicitudesCambioEgresado(propuestaActiva.id),
    getOpcionesDestinoCambio(propuestaActiva.id),
    getInformesMensuales(propuestaActiva.id),
    getPeriodosPropuesta(propuestaActiva.id),
  ]);
  const solicitudes = solicitudesRes.success && solicitudesRes.solicitudes ? solicitudesRes.solicitudes : [];
  const informesMensualesList = informesRes.success && informesRes.informes ? informesRes.informes : [];
  const opciones =
    opcionesRes.success && opcionesRes.meses && opcionesRes.posicionActual && opcionesRes.actividades
      ? { meses: opcionesRes.meses, posicionActual: opcionesRes.posicionActual, actividades: opcionesRes.actividades }
      : { meses: [], posicionActual: { mes: res.mesActual ?? 1, semana: res.semanaActual ?? 1 }, actividades: [] };

  const actividadesPendientesMes = res.grupos
    .filter((g) => g.periodo === res.mesActual)
    .flatMap((g) => g.actividades)
    .filter((a) => !a.registro || a.registro.estado === "pendiente" || a.registro.estado === "guardado").length;

  const cierreRes = res.mesActual
    ? await verificarCierrePeriodo(propuestaActiva.id, res.mesActual, actividadesPendientesMes, res.porcentajeAvance)
    : null;
  const diasRestantesCierre: number | null = cierreRes?.success ? cierreRes.diasRestantes ?? null : null;
  const periodoCerrado: boolean = cierreRes?.success ? !!cierreRes.cerrado : false;

  const periodoActual = periodosProp.find((p) => p.num === res.mesActual) || null;
  const grupoActual = res.grupos.find((g) => g.estadoGrupo === "habilitada") || null;

  const conGrupo = (estado: "completada" | "bloqueada") =>
    res.grupos
      .filter((g) => g.estadoGrupo === estado)
      .flatMap((g) => g.actividades.map((a) => ({ ...a, periodo: g.periodo, semana: g.semana })));
  const proximas = conGrupo("bloqueada");
  const completadas = conGrupo("completada");
  // Una actividad observada puede estar en una semana completada: debe corregirse aunque la semana ya avanzó.
  const observadas = completadas.filter((a) => a.registro?.estado === "observado");

  const hrefVista = (v: Vista, p?: number) => `/egresado/reportes?vista=${v}${p && p > 1 ? `&pagina=${p}` : ""}`;

  const pestanas: { id: Vista; label: string; total: number }[] = [
    { id: "actual", label: "Semana actual", total: grupoActual?.actividades.length ?? 0 },
    { id: "proximas", label: "Próximas", total: proximas.length },
    { id: "completadas", label: "Completadas", total: completadas.length },
  ];

  const enviadasSemana = grupoActual
    ? grupoActual.actividades.filter((a) => ["enviado", "observado", "aprobado"].includes(a.registro?.estado || "")).length
    : 0;

  const listaPaginada =
    vista === "proximas" ? paginar(proximas, pagina, TAMANO_PAGINA) : paginar(completadas, pagina, TAMANO_PAGINA);

  return (
    <div className="space-y-6">
      {encabezado}

      {/* Resumen de avance */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Ubicación actual</span>
            <span className="text-sm font-extrabold text-slate-900">
              Mes {res.mesActual}, Semana {res.semanaActual}
            </span>
            {periodoActual?.inicio && (
              <span className="block text-[11px] text-slate-500 font-semibold">
                {formatearFechaLarga(periodoActual.inicio)} al {formatearFechaLarga(periodoActual.fin)}
              </span>
            )}
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Fecha límite del informe del mes</span>
            <span className="text-sm font-extrabold text-slate-900">{formatearFechaLarga(res.fechaLimiteMesActual as string | null)}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Docente asesor</span>
            <span className="text-sm font-extrabold text-slate-900">{res.asesor?.nombreCompleto || "Sin asignar"}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase text-slate-400">Avance general</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-red rounded-full" style={{ width: `${res.porcentajeAvance}%` }} />
              </div>
              <span className="text-xs font-extrabold text-slate-700">{res.porcentajeAvance}%</span>
            </div>
            <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
              {res.completadas} de {res.totalActividades} actividades enviadas
            </span>
          </div>
        </div>
      </div>

      {periodoCerrado ? (
        <div className="p-4 rounded-xl border bg-slate-800 border-slate-900 text-white text-xs font-semibold">
          <span className="font-extrabold">Fecha límite vencida.</span> La fecha límite del informe del Mes {res.mesActual} fue el{" "}
          {formatearFechaLarga(cierreRes?.success ? (cierreRes.fechaLimite as string) : null)}. El informe se compone con la información
          registrada; si aún no lo ha enviado, su entrega quedará registrada fuera del plazo.
          {actividadesPendientesMes > 0 && ` Actividades pendientes del mes: ${actividadesPendientesMes}.`}
        </div>
      ) : (
        diasRestantesCierre !== null &&
        diasRestantesCierre <= 3 &&
        diasRestantesCierre >= 0 && (
          <div className="p-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold">
            <span className="font-extrabold">Fecha límite próxima.</span> Faltan {diasRestantesCierre} día
            {diasRestantesCierre !== 1 ? "s" : ""} para la fecha límite del informe del Mes {res.mesActual}.
            {actividadesPendientesMes > 0
              ? ` Tiene ${actividadesPendientesMes} actividad${actividadesPendientesMes > 1 ? "es" : ""} pendiente${actividadesPendientesMes > 1 ? "s" : ""} de registrar o enviar.`
              : " No tiene actividades pendientes por registrar."}
          </div>
        )
      )}

      {observadas.length > 0 && (
        <div className="p-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold space-y-2">
          <p className="font-extrabold">
            Su docente asesor solicitó correcciones en {observadas.length} actividad{observadas.length > 1 ? "es" : ""} de semanas anteriores:
          </p>
          <div className="flex flex-wrap gap-2">
            {observadas.map((a) => (
              <Link
                key={a.id}
                href={`/egresado/reportes/actividad/${a.id}`}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-mono font-bold text-[11px] hover:bg-amber-100"
              >
                Corregir {a.codigo}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actividades */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-5 pt-5">
          <h2 className="text-sm font-extrabold text-slate-900">Actividades del cronograma</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Solo puede registrar las actividades de su semana actual. Al enviar todas las actividades de la semana se habilita
            automáticamente la siguiente.
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

        <div className="p-5">
          {vista === "actual" &&
            (grupoActual ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Mes {grupoActual.periodo}, Semana {grupoActual.semana}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {enviadasSemana} de {grupoActual.actividades.length} actividades enviadas en esta semana
                    </p>
                  </div>
                  <div className="w-full sm:w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.round((enviadasSemana / grupoActual.actividades.length) * 100)}%` }}
                    />
                  </div>
                </div>

                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {grupoActual.actividades.map((a) => {
                    const estado = a.registro?.estado || "pendiente";
                    const info = ESTADO_ACTIVIDAD[estado] || ESTADO_ACTIVIDAD.pendiente;
                    const palabras = a.registro?.descriptor ? contarPalabras(a.registro.descriptor) : 0;
                    const indicadores = [
                      { label: "Marco teórico", ok: (a.registro?.marcoTeorico?.trim().length ?? 0) >= 10 },
                      {
                        label: `Descriptor (${palabras} palabra${palabras === 1 ? "" : "s"})`,
                        ok: palabras >= DESCRIPTOR_MIN_PALABRAS && palabras <= DESCRIPTOR_MAX_PALABRAS,
                      },
                      { label: "Cita APA 7", ok: (a.registro?.citaApa?.trim().length ?? 0) >= 5 },
                    ];
                    const completos = indicadores.filter((i) => i.ok).length;
                    return (
                      <li key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-bold text-slate-500">{a.codigo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>
                              {info.label}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800">{a.titulo || a.descripcion}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {indicadores.map((i) => (
                              <span
                                key={i.label}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  i.ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-400 border-slate-200"
                                }`}
                              >
                                {i.label}
                              </span>
                            ))}
                            <span className="text-[10px] text-slate-400 font-semibold">{completos} de 3 apartados completos</span>
                          </div>
                          {a.registro?.comentarioAsesor && estado === "observado" && (
                            <p className="text-[11px] text-amber-800 font-semibold">Observación del asesor: {a.registro.comentarioAsesor}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {a.registro?.enviadoEn && (
                            <span className="text-[10px] text-slate-400 font-semibold">Enviada: {formatFecha(a.registro.enviadoEn)}</span>
                          )}
                          <Link
                            href={`/egresado/reportes/actividad/${a.id}`}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                              info.accion === "Ver"
                                ? "border border-slate-200 text-slate-700 hover:bg-slate-100"
                                : "bg-brand-red hover:bg-brand-red-hover text-white"
                            }`}
                          >
                            {info.accion}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-semibold">
                Ha completado todas las actividades del cronograma. Puede consultarlas en la pestaña Completadas.
              </p>
            ))}

          {vista !== "actual" &&
            (listaPaginada.items.length === 0 ? (
              <p className="text-xs text-slate-500 font-semibold">
                {vista === "proximas" ? "No hay actividades en semanas posteriores." : "Aún no ha completado ninguna semana."}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Actividad</th>
                        <th className="py-2.5 px-3">Mes / Semana</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">{vista === "proximas" ? "Disponibilidad" : "Enviada"}</th>
                        {vista === "completadas" && <th className="py-2.5 px-3 text-right">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {listaPaginada.items.map((a) => {
                        const estado = a.registro?.estado || "pendiente";
                        const info = ESTADO_ACTIVIDAD[estado] || ESTADO_ACTIVIDAD.pendiente;
                        return (
                          <tr key={a.id} className={vista === "proximas" ? "text-slate-400" : ""}>
                            <td className="py-2.5 px-3 font-mono font-bold">{a.codigo}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">{a.titulo || a.descripcion}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              Mes {a.periodo}, Semana {a.semana}
                            </td>
                            <td className="py-2.5 px-3">
                              {vista === "proximas" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-slate-50 text-slate-400 border-slate-200">
                                  Bloqueada
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>
                                  {info.label}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                              {vista === "proximas" ? "Al completar las semanas anteriores" : formatFecha(a.registro?.enviadoEn)}
                            </td>
                            {vista === "completadas" && (
                              <td className="py-2.5 px-3 text-right">
                                <Link
                                  href={`/egresado/reportes/actividad/${a.id}`}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                                    estado === "observado"
                                      ? "bg-brand-red hover:bg-brand-red-hover text-white"
                                      : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  {info.accion}
                                </Link>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Paginacion
                  paginaActual={listaPaginada.paginaActual}
                  totalPaginas={listaPaginada.totalPaginas}
                  totalElementos={vista === "proximas" ? proximas.length : completadas.length}
                  tamanoPagina={TAMANO_PAGINA}
                  construirHref={(p) => hrefVista(vista, p)}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Informes mensuales */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Informes mensuales</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Cada informe se compone automáticamente con las actividades registradas. Puede enviarse cuando finaliza el período del
            mes y todos sus apartados están completos.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {informesMensualesList.map((im) => {
            const estado = ESTADO_INFORME[im.estado] || ESTADO_INFORME.redactando;
            return (
              <div key={im.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">Informe #{im.numero}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border text-center ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                  <p>Fecha límite: {formatearFechaLarga(im.fechaLimite)}</p>
                  {im.enviadoEn && <p>Enviado: {formatFecha(im.enviadoEn)}</p>}
                  {im.cumplimiento && <p>{im.cumplimiento === "a_tiempo" ? "Entregado a tiempo" : "Entregado fuera de tiempo"}</p>}
                </div>
                <div className="mt-auto flex flex-col gap-1.5 pt-1">
                  <Link
                    href={`/egresado/reportes/informe/${im.id}`}
                    className="text-center px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold"
                  >
                    {im.estado === "redactando" || im.estado === "observado" ? "Revisar y enviar" : "Ver estado"}
                  </Link>
                  <Link
                    href={`/informes/${im.id}/imprimir`}
                    target="_blank"
                    className="text-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-[11px] font-bold"
                  >
                    Ver documento
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SolicitudesCambioActividad propuestaId={propuestaActiva.id} opciones={opciones} solicitudesIniciales={solicitudes} />
    </div>
  );
}
