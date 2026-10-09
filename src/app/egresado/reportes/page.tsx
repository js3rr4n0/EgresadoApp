import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSeguimientoEgresado } from "@/app/actions/registrosActividad";
import { getSolicitudesCambioEgresado, getOpcionesDestinoCambio } from "@/app/actions/cambiosActividad";
import { verificarCierrePeriodo, getInformesMensuales } from "@/app/actions/informesMensuales";
import { getPeriodosPropuesta } from "@/lib/habilitacionActividades";
import {
  contarPalabras,
  validarContenidoRegistro,
  DESCRIPTOR_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  CONCLUSION_MAX_PALABRAS,
} from "@/lib/reglasRegistroActividad";
import { validarOrigenImagen } from "@/lib/fuenteImagen";
import { formatearFechaLarga, rangoFechasTexto, rangoSemanaISO, hoyISOElSalvador, nombreCortoInforme } from "@/lib/periodosPasantia";
import Paginacion, { paginar } from "@/components/Paginacion";
import SolicitudesCambioActividad from "./SolicitudesCambioActividad";
import EnviarSemana from "./EnviarSemana";

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
        <h1 className="text-2xl font-extrabold text-slate-900">Reportes de actividades</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Pasantía como Trabajo de Graduación</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/egresado/reportes/bitacora"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-extrabold text-xs transition-colors w-fit"
        >
          Bitácora del proceso
        </Link>
        <Link
          href="/egresado"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-2xs w-fit"
        >
          Volver al panel principal
        </Link>
      </div>
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
      ? {
          meses: opcionesRes.meses,
          posicionActual: opcionesRes.posicionActual,
          actividades: opcionesRes.actividades,
          eliminacionesPorMes: opcionesRes.eliminacionesPorMes ?? {},
          maxEliminacionesPorMes: opcionesRes.maxEliminacionesPorMes ?? 1,
        }
      : {
          meses: [],
          posicionActual: { mes: res.mesActual ?? 1, semana: res.semanaActual ?? 1 },
          actividades: [],
          eliminacionesPorMes: {},
          maxEliminacionesPorMes: 1,
        };

  const actividadesPendientesMes = res.grupos
    .filter((g) => g.periodo === res.mesActual)
    .flatMap((g) => g.actividades)
    .filter((a) => !a.registro || a.registro.estado === "pendiente" || a.registro.estado === "guardado").length;

  const cierreRes = res.mesActual
    ? await verificarCierrePeriodo(propuestaActiva.id, res.mesActual, actividadesPendientesMes, res.porcentajeAvance)
    : null;
  // Entrega esperada: día 30 del período. El límite de la cohorte es el máximo; al vencer, el período se cierra.
  const periodoCerrado: boolean = cierreRes?.success ? !!cierreRes.cerrado : false;
  const informeActual = informesMensualesList.find((i) => i.numero === res.mesActual);
  const informePresentado = informeActual?.estado === "enviado" || informeActual?.estado === "aprobado";
  const hoy = hoyISOElSalvador();
  const entregaDe = (im: (typeof informesMensualesList)[number]) => {
    const fecha = periodosProp.find((p) => p.num === im.numero)?.fin ?? im.fechaLimite;
    if (im.estado === "enviado" || im.estado === "aprobado") return { fecha, texto: null, tono: "", limite: null };
    const dias = Math.round((Date.parse(fecha) - Date.parse(hoy)) / (1000 * 60 * 60 * 24));
    if (im.cerrado) return { fecha, texto: "Límite de la cohorte vencido", tono: "text-slate-900 font-extrabold", limite: null };
    if (dias < 0)
      return { fecha, texto: `Con ${-dias} día${dias === -1 ? "" : "s"} de retraso`, tono: "text-red-700", limite: im.fechaLimite };
    if (dias === 0) return { fecha, texto: "Vence hoy", tono: "text-amber-800", limite: null };
    return { fecha, texto: `Faltan ${dias} día${dias === 1 ? "" : "s"}`, tono: dias <= 3 ? "text-amber-800" : "", limite: null };
  };

  const periodoActual = periodosProp.find((p) => p.num === res.mesActual) || null;
  const grupoActual = res.grupos.find((g) => g.estadoGrupo === "habilitada" || g.estadoGrupo === "en_revision") || null;
  const semanaEnRevision = grupoActual?.estadoGrupo === "en_revision";
  // Margen de una semana: con la semana actual enviada, la siguiente puede redactarse en borrador.
  const grupoAdelantado = res.grupos.find((g) => g.estadoGrupo === "adelantada") || null;
  const metrica = res.metricaPaginas;
  const paginasTotales = Math.round(metrica.paginasTotales);
  const paginasEsperadas = Math.round(metrica.paginasEsperadasHoy);
  const paginasInformeActual = metrica.porInforme.find((i) => i.numero === res.mesActual);
  const informesAnteriores = metrica.porInforme.filter((i) => res.mesActual !== null && i.numero < res.mesActual);
  const RITMO = {
    adecuado: {
      etiqueta: "Ritmo adecuado",
      badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
      barra: "bg-emerald-600",
      mensaje: "Su producción de actividades va de acuerdo con el tiempo transcurrido de la pasantía.",
      caja: "bg-emerald-50 border-emerald-200 text-emerald-900",
    },
    atencion: {
      etiqueta: "Ritmo regular",
      badge: "bg-amber-50 text-amber-900 border-amber-300",
      barra: "bg-amber-500",
      mensaje: "Su producción de actividades está ligeramente por debajo de lo esperado para el tiempo transcurrido de la pasantía.",
      caja: "bg-amber-50 border-amber-300 text-amber-900",
    },
    critico: {
      etiqueta: "Ritmo insuficiente",
      badge: "bg-red-50 text-red-700 border-red-300",
      barra: "bg-red-600",
      mensaje: "Su producción de actividades está por debajo de lo esperado para el tiempo transcurrido de la pasantía.",
      caja: "bg-red-50 border-red-200 text-red-800",
    },
  }[metrica.nivel];
  const rangoSemanaActual =
    grupoActual && periodoActual?.inicio && periodoActual.fin
      ? rangoSemanaISO(periodoActual.inicio, periodoActual.fin, grupoActual.semana, periodoActual.semanas)
      : null;

  const conGrupo = (estado: "completada" | "bloqueada") =>
    res.grupos
      .filter((g) => g.estadoGrupo === estado)
      .flatMap((g) => g.actividades.map((a) => ({ ...a, periodo: g.periodo, semana: g.semana })));
  const proximas = conGrupo("bloqueada");
  const completadas = conGrupo("completada");

  const hrefVista = (v: Vista, p?: number) => `/egresado/reportes?vista=${v}${p && p > 1 ? `&pagina=${p}` : ""}`;

  const pestanas: { id: Vista; label: string; total: number }[] = [
    { id: "actual", label: "Semana actual", total: (grupoActual?.actividades.length ?? 0) + (grupoAdelantado?.actividades.length ?? 0) },
    { id: "proximas", label: "Próximas", total: proximas.length },
    { id: "completadas", label: "Completadas", total: completadas.length },
  ];

  const enviadasSemana = grupoActual
    ? grupoActual.actividades.filter((a) => ["enviado", "aprobado"].includes(a.registro?.estado || "")).length
    : 0;

  // Apartados faltantes de la semana (las actividades ya enviadas o aprobadas no se validan de nuevo).
  const pendientesEnvioSemana =
    grupoActual && !semanaEnRevision
      ? grupoActual.actividades
          .filter((a) => ["pendiente", "guardado", "observado"].includes(a.registro?.estado || "pendiente"))
          .flatMap((a) => validarContenidoRegistro(a.registro || {}).map((p) => `${a.codigo}: ${p}`))
      : [];
  const actividadesPorEnviar = grupoActual
    ? grupoActual.actividades.filter((a) => ["pendiente", "guardado", "observado"].includes(a.registro?.estado || "pendiente")).length
    : 0;

  type ActividadSemana = (typeof res.grupos)[number]["actividades"][number];
  const filaActividad = (a: ActividadSemana) => {
    const estado = a.registro?.estado || "pendiente";
    const info = ESTADO_ACTIVIDAD[estado] || ESTADO_ACTIVIDAD.pendiente;
    const palabras = a.registro?.descriptor ? contarPalabras(a.registro.descriptor) : 0;
    const palabrasConclusion = a.registro?.conclusionTecnica ? contarPalabras(a.registro.conclusionTecnica) : 0;
    const indicadores = [
      { label: "Marco teórico", ok: (a.registro?.marcoTeorico?.trim().length ?? 0) >= 10 },
      { label: "Cita APA 7", ok: (a.registro?.citaApa?.trim().length ?? 0) >= 5 },
      {
        label: `Descripción (${palabras} palabra${palabras === 1 ? "" : "s"})`,
        ok: palabras >= DESCRIPTOR_MIN_PALABRAS && palabras <= DESCRIPTOR_MAX_PALABRAS,
      },
      {
        label: `Conclusión técnica (${palabrasConclusion} palabra${palabrasConclusion === 1 ? "" : "s"})`,
        ok: palabrasConclusion >= CONCLUSION_MIN_PALABRAS && palabrasConclusion <= CONCLUSION_MAX_PALABRAS,
      },
    ];
    indicadores.push({
      label: "Imagen principal",
      ok:
        !!a.registro?.imagenUrl &&
        (a.registro?.leyendaImagen?.trim().length ?? 0) >= 3 &&
        validarOrigenImagen(a.registro?.imagenOrigen, a.registro?.imagenFuente).length === 0,
    });
    const completos = indicadores.filter((i) => i.ok).length;
    return (
      <li key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-slate-500">{a.codigo}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${info.badge}`}>
              {info.label}
            </span>
            {a.pospuesta && !["enviado", "aprobado"].includes(estado) && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-amber-50 text-amber-900 border-amber-300"
                title="Debe completarla o solicitar su eliminación antes de enviar el informe del período."
              >
                Pospuesta
              </span>
            )}
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
            <span className="text-[10px] text-slate-400 font-semibold">
              {completos} de {indicadores.length} apartados completos
            </span>
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
                : "bg-unicaes hover:bg-unicaes-hover text-white"
            }`}
          >
            {info.accion}
          </Link>
        </div>
      </li>
    );
  };

  const listaPaginada =
    vista === "proximas" ? paginar(proximas, pagina, TAMANO_PAGINA) : paginar(completadas, pagina, TAMANO_PAGINA);

  return (
    <div className="space-y-6">
      {encabezado}

      {periodoCerrado && !informePresentado && (
        <div className="p-4 rounded-xl border bg-slate-800 border-slate-900 text-white text-xs font-semibold">
          <span className="font-extrabold">Límite de la cohorte vencido.</span> El límite para el informe del Período {res.mesActual} fue el{" "}
          {formatearFechaLarga(cierreRes?.success ? (cierreRes.fechaLimite as string) : null)}. El informe se compone con la información
          registrada; si aún no lo ha enviado, su entrega quedará registrada fuera del plazo.
        </div>
      )}

      {/* Extensión de los informes: páginas estimadas frente al mínimo y al ritmo esperado */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Extensión de los informes</h2>
            <p className="mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{paginasTotales}</span>
              <span className="text-xs font-bold text-slate-500"> de {metrica.minimoTotal} páginas totales</span>
              {paginasEsperadas > 0 && (
                <span className="text-[11px] font-semibold text-slate-400"> · esperadas a la fecha: {paginasEsperadas}</span>
              )}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border w-fit shrink-0 ${RITMO.badge}`}>
            {RITMO.etiqueta}
          </span>
        </div>

        <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-label="Páginas registradas frente al total">
          <div
            className={`h-full rounded-full ${RITMO.barra}`}
            style={{ width: `${Math.min(100, Math.round((metrica.paginasTotales / metrica.minimoTotal) * 100))}%` }}
          />
          {metrica.paginasEsperadasHoy > 0 && (
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-700"
              title="Páginas esperadas a la fecha"
              style={{ left: `${Math.min(100, Math.round((metrica.paginasEsperadasHoy / metrica.minimoTotal) * 100))}%` }}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paginasInformeActual && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800">Informe {paginasInformeActual.numero} (actual)</span>
                <span className="text-xs font-bold text-slate-600">
                  {Math.round(paginasInformeActual.paginas)} de {paginasInformeActual.minimo} páginas
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${paginasInformeActual.paginas >= paginasInformeActual.minimo ? "bg-emerald-600" : "bg-unicaes"}`}
                  style={{ width: `${Math.min(100, Math.round((paginasInformeActual.paginas / paginasInformeActual.minimo) * 100))}%` }}
                />
              </div>
            </div>
          )}
          {informesAnteriores.length > 0 && (
            <div className="rounded-xl border border-slate-200 px-4 py-3 space-y-2">
              <span className="block text-xs font-extrabold text-slate-800">Informes anteriores</span>
              <div className="flex flex-wrap gap-1.5">
                {informesAnteriores.map((i) => {
                  const cumple = i.paginas >= i.minimo;
                  return (
                    <span
                      key={i.numero}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        cumple ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      Informe {i.numero}: {Math.round(i.paginas)} págs. · {cumple ? "cumplió" : "no alcanzó el mínimo"}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className={`px-3 py-2.5 rounded-lg border text-[11px] font-semibold ${RITMO.caja}`}>{RITMO.mensaje}</p>

        <details className="text-[11px] text-slate-500 font-medium">
          <summary className="cursor-pointer w-fit font-bold text-slate-600 hover:text-slate-900 select-none">Más información</summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            <div>
              <p className="font-extrabold text-slate-700">Cómo se calcula</p>
              <p>
                La cantidad se estima a partir del marco teórico, el desarrollo y las imágenes de soporte de cada actividad registrada.
                Cada informe requiere un mínimo de {metrica.minimoPorInforme} páginas ({metrica.minimoTotal} en total). Las páginas
                esperadas a la fecha se calculan según el tiempo transcurrido de la pasantía.
              </p>
            </div>
            <div>
              <p className="font-extrabold text-slate-700">Qué hacer si la producción es deficiente</p>
              <p>
                Si la producción no alcanza lo mínimo para cada informe, usted debe completar con actividades adicionales, añadiendo estos
                cambios a su cronograma desde Cambios al cronograma.
              </p>
            </div>
          </div>
        </details>
      </div>

      {/* Actividades */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-5 pt-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Actividades del cronograma</h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5 max-w-2xl">
              Complete todas las actividades de su semana actual y envíelas juntas a su asesor designado. Mientras la revisa, puede
              adelantar en borrador la semana siguiente; podrá enviarla cuando el asesor apruebe la anterior.
            </p>
          </div>
          <div className="w-full md:w-60 shrink-0 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Avance general</span>
              <span className="text-sm font-extrabold text-slate-900">{res.porcentajeAvance}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-unicaes rounded-full" style={{ width: `${res.porcentajeAvance}%` }} />
            </div>
            <span className="block text-[11px] text-slate-500 font-semibold">
              {res.completadas} de {res.totalActividades} actividades enviadas
            </span>
          </div>
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

        <div className="p-5">
          {vista === "actual" &&
            (grupoActual ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Período {grupoActual.periodo}, Semana {grupoActual.semana}
                      {rangoSemanaActual && (
                        <span className="font-semibold text-slate-500"> · {rangoFechasTexto(rangoSemanaActual.inicio, rangoSemanaActual.fin)}</span>
                      )}
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

                {semanaEnRevision ? (
                  <div className="p-4 rounded-xl border bg-blue-50 border-blue-200 text-blue-900 text-xs font-semibold">
                    La semana fue enviada y se encuentra en revisión por su asesor designado.
                    {grupoAdelantado
                      ? " Mientras tanto puede avanzar en el borrador de la semana siguiente; podrá enviarla cuando el asesor apruebe esta."
                      : " La semana siguiente se habilitará cuando el asesor la apruebe."}
                  </div>
                ) : (
                  <EnviarSemana
                    propuestaId={propuestaActiva.id}
                    etiquetaSemana={`Semana ${grupoActual.semana} del Período ${grupoActual.periodo}`}
                    pendientes={pendientesEnvioSemana}
                    cantidad={actividadesPorEnviar}
                  />
                )}

                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {grupoActual.actividades.map(filaActividad)}
                </ul>

                {grupoAdelantado && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Período {grupoAdelantado.periodo}, Semana {grupoAdelantado.semana}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-slate-100 text-slate-600 border-slate-300 align-middle">
                          Solo borrador
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Puede adelantar la redacción de la semana siguiente. Podrá enviarla cuando su asesor designado apruebe la Semana{" "}
                        {grupoActual.semana} del Período {grupoActual.periodo}.
                      </p>
                    </div>
                    <ul className="divide-y divide-slate-100 border border-dashed border-slate-300 rounded-xl">
                      {grupoAdelantado.actividades.map(filaActividad)}
                    </ul>
                  </div>
                )}
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
                              Período {a.periodo}, Semana {a.semana}
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
                                      ? "bg-unicaes hover:bg-unicaes-hover text-white"
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
          <h2 className="text-sm font-extrabold text-slate-900">Informes del período</h2>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Cada informe se compone automáticamente con las actividades registradas. Puede enviarlo en cuanto su asesor designado
            apruebe todas las semanas del período; la fecha de entrega es el día 30 del período.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {informesMensualesList.map((im) => {
            const estado = ESTADO_INFORME[im.estado] || ESTADO_INFORME.redactando;
            return (
              <div
                key={im.id}
                className={`p-4 bg-slate-50 border rounded-xl flex flex-col gap-2 ${
                  im.numero === res.mesActual ? "border-unicaes ring-1 ring-unicaes/30" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-800">{nombreCortoInforme(im.numero)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border text-center ${estado.badge}`}>
                    {estado.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold space-y-0.5">
                  {(() => {
                    const entrega = entregaDe(im);
                    return (
                      <>
                        <p>Entrega: {formatearFechaLarga(entrega.fecha)}</p>
                        {entrega.texto && <p className={`font-bold ${entrega.tono}`}>{entrega.texto}</p>}
                        {entrega.limite && <p className="text-[10px]">Límite de la cohorte: {formatearFechaLarga(entrega.limite)}</p>}
                      </>
                    );
                  })()}
                  {(() => {
                    const pags = metrica.porInforme.find((p) => p.numero === im.numero);
                    return pags ? (
                      <p className={pags.paginas >= pags.minimo ? "text-emerald-700" : ""}>
                        Extensión: {Math.round(pags.paginas)} de {pags.minimo} páginas
                      </p>
                    ) : null;
                  })()}
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
