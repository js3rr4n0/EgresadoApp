import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { empresas, firmantes, organigramasEmpresa, sucursales, supervisores } from "@/lib/schema";
import { leerProcesosEmpresas } from "@/lib/procesosEmpresas";
import { calcularEstadisticas, compararRecientes, NOMBRE_MODALIDAD, type Modalidad } from "@/lib/estadisticasEmpresas";
import { isoDia } from "@/lib/seguimientoCohortes";
import AbrirArchivo from "./AbrirArchivo";
import TablaHistorial from "./TablaHistorial";
import { leerHistorialEmpresa } from "@/lib/historialEmpresaServidor";
import { BotonArchivarReporte, BotonEstadoEmpresa, FormularioReporte } from "./AccionesEmpresa";
import { leerBitacoraEmpresa, leerReportesEmpresa } from "@/lib/bitacoraEmpresaServidor";
import { NOMBRE_ORIGEN } from "@/lib/bitacoraEmpresa";
import { valoracionesDeEmpresas, type ValoracionEmpresa } from "@/lib/valoracionesServidor";
import { formatoNota, type ResumenValoracion } from "@/lib/valoraciones";
import Nota from "@/components/valoraciones/Nota";

function BarrasAspectos({ resumen }: { resumen: ResumenValoracion }) {
  return (
    <div className="space-y-2">
      {resumen.porAspecto.map((a) => (
        <div key={a.clave}>
          <div className="flex justify-between text-xs"><span className="text-gray-600">{a.nombre}</span><span className="font-bold text-gray-800">{formatoNota(a.promedio)}</span></div>
          <div className="h-1.5 rounded-full bg-gray-100 mt-0.5 overflow-hidden">
            <div className="h-full bg-brand-red rounded-full" style={{ width: `${((a.promedio ?? 0) / 10) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SeccionValoraciones({ v }: { v: ValoracionEmpresa | undefined }) {
  if (!v) {
    return (
      <p className="text-sm text-muted">
        Todavía no hay valoraciones. Llegan cuando cierra un proceso (egresado y asesor valoran a la empresa) y cuando el asesor completa la visita de 90 días.
      </p>
    );
  }
  const ultimaE = v.egresados.ultima;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-border p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Nota general</p>
          <div className="mt-2"><Nota valor={v.general} grande /></div>
          <p className="text-xs text-muted mt-2">Promedio de la nota de los egresados y la de los asesores, de 1 a 10.</p>
        </div>
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Egresados</p>
            <span className="text-xs text-muted">{v.egresados.procesos} {v.egresados.procesos === 1 ? "proceso" : "procesos"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Nota valor={v.egresados.promedio} grande />
            {ultimaE && <span className="text-xs text-muted">Última: <b className="text-gray-700">{formatoNota(ultimaE.promedio)}</b> ({ultimaE.cohorte})</span>}
          </div>
          {v.egresados.procesos > 0 && <BarrasAspectos resumen={v.egresados} />}
        </div>
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Asesores</p>
            <span className="text-xs text-muted">{v.asesores.procesos} {v.asesores.procesos === 1 ? "proceso" : "procesos"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Nota valor={v.asesores.promedio} grande />
            {v.asesores.ultima && <span className="text-xs text-muted">Última: <b className="text-gray-700">{formatoNota(v.asesores.ultima.promedio)}</b> ({v.asesores.ultima.cohorte})</span>}
          </div>
          <p className="text-xs text-muted">
            Valoración al cierre: <b className="text-gray-700">{formatoNota(v.asesoresCierre.promedio)}</b> · Visita de 90 días:{" "}
            <b className="text-gray-700">{formatoNota(v.visitas.promedio)}</b>
            {v.visitas.cantidad > 0 && ` (${v.visitas.cantidad} ${v.visitas.cantidad === 1 ? "visita" : "visitas"})`}
          </p>
          {v.asesoresCierre.procesos > 0 && <BarrasAspectos resumen={v.asesoresCierre} />}
        </div>
      </div>
      {v.comentarios.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">Comentarios</p>
          <ul className="space-y-2">
            {v.comentarios.slice(0, 8).map((c, i) => (
              <li key={i} className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg p-3">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">
                  {c.tipo === "egresado_empresa" ? "Egresado" : "Asesor"} · {c.cohorte}
                </span>
                {c.texto}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type Vista = "resumen" | "egresados" | "reportes" | "bitacora";

const fechaLarga = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });
const horaCorta = (iso: string) => new Date(iso).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalle de empresa | Admin" };

const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const MODALIDADES: Modalidad[] = ["pasantia", "proyecto", "investigacion"];

function Seccion({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <header className="px-5 py-3 border-b border-border bg-gray-50 flex items-baseline justify-between gap-3">
        <h2 className="font-bold text-card-dark">{titulo}</h2>
        {detalle && <span className="text-xs text-muted">{detalle}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Indicador({ etiqueta, valor, detalle, acento }: { etiqueta: string; valor: React.ReactNode; detalle?: string; acento?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 bg-white shadow-sm ${acento ? "border-brand-red/30" : "border-border"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{etiqueta}</p>
      <p className={`mt-1 text-xl font-bold ${acento ? "text-brand-red" : "text-gray-800"}`}>{valor}</p>
      {detalle && <p className="text-xs text-muted mt-0.5">{detalle}</p>}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{etiqueta}</dt>
      <dd className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{children || <span className="text-muted">Sin registrar</span>}</dd>
    </div>
  );
}

const nombrePersona = (p: { titulo?: string | null; nombres: string; apellidos: string }) =>
  [p.titulo, p.nombres, p.apellidos].filter(Boolean).join(" ");

const enlaceMapa = (mapa: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapa)}`;

export default async function DetalleEmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id));
  if (!empresa) notFound();

  const { vista: vistaParam } = await searchParams;
  const vista: Vista = vistaParam === "egresados" || vistaParam === "reportes" || vistaParam === "bitacora" ? vistaParam : "resumen";

  const [sups, firms, orgs, sucs, procesos, reportes, bitacora] = await Promise.all([
    db.select().from(supervisores).where(eq(supervisores.empresaId, id)),
    db.select().from(firmantes).where(eq(firmantes.empresaId, id)),
    db.select().from(organigramasEmpresa).where(eq(organigramasEmpresa.empresaId, id)).orderBy(desc(organigramasEmpresa.id)),
    db.select().from(sucursales).where(eq(sucursales.empresaId, id)),
    leerProcesosEmpresas(id),
    leerReportesEmpresa(id),
    leerBitacoraEmpresa(id),
  ]);
  const [valoraciones, historial] = await Promise.all([valoracionesDeEmpresas(id), leerHistorialEmpresa(id)]);
  const valoracion = valoraciones[id];
  const vigentes = reportes.filter((r) => r.estado === "vigente");
  const hoy = isoDia(new Date());

  const est = calcularEstadisticas(procesos, isoDia(new Date()));
  const recientes = [...procesos].sort(compararRecientes);
  const nombreSucursal = (sid: number | null) => (sid ? sucs.find((s) => s.id === sid)?.nombre ?? "Sucursal" : "Sede central");
  const organigrama = orgs[0]?.url ?? empresa.organigramaUrl;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <Link href="/admin/empresas" className="text-sm font-semibold text-muted hover:text-brand-red transition-colors">
          Volver al catálogo de empresas
        </Link>
        <div className="mt-3 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{empresa.nombre}</h1>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${empresa.habilitada ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                {empresa.habilitada ? "Activa" : "Deshabilitada"}
              </span>
              {vigentes.length > 0 && (
                <Link href={`/admin/empresas/${id}?vista=reportes`} className="px-2.5 py-1 text-xs font-bold rounded-md bg-red-50 text-brand-red border border-brand-red/20 hover:bg-red-100">
                  {cuenta(vigentes.length, "reporte vigente", "reportes vigentes")}
                </Link>
              )}
            </div>
            <p className="text-sm text-muted mt-1">{empresa.area || "Sin área especificada"}</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <BotonEstadoEmpresa
              empresa={{ id, nombre: empresa.nombre, habilitada: empresa.habilitada }}
              reportes={vigentes.map(({ id: rid, fecha, origen, descripcion }) => ({ id: rid, fecha, origen, descripcion }))}
              notas={valoracion ? { egresados: valoracion.egresados.promedio, asesores: valoracion.asesores.promedio, general: valoracion.general } : null}
            />
            <a href={`/admin/empresas/${id}/imprimir`} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-xl border border-border bg-white text-sm font-bold text-gray-700 hover:border-brand-red hover:text-brand-red transition-colors">
              Descargar PDF
            </a>
            <Link href={`/admin/empresas?editar=${id}`} className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors">
              Editar datos
            </Link>
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Indicador etiqueta="Valoración de egresados" valor={<span className="text-base"><Nota valor={valoracion?.egresados.promedio ?? null} vacio="Sin valoraciones" /></span>} detalle={valoracion?.egresados.ultima ? `Última: ${formatoNota(valoracion.egresados.ultima.promedio)} (${valoracion.egresados.ultima.cohorte})` : undefined} />
        <Indicador etiqueta="Valoración de asesores" valor={<span className="text-base"><Nota valor={valoracion?.asesores.promedio ?? null} vacio="Sin valoraciones" /></span>} detalle={valoracion?.asesores.ultima ? `Última: ${formatoNota(valoracion.asesores.ultima.promedio)} (${valoracion.asesores.ultima.cohorte})` : undefined} />
        <Indicador etiqueta="Procesos" valor={est.procesos} detalle={`${est.egresados} ${est.egresados === 1 ? "egresado" : "egresados"}`} />
        <Indicador etiqueta="Cohortes" valor={est.cohortes.length} detalle={est.cohortesEnCurso > 0 ? `${est.cohortesEnCurso} en curso` : undefined} />
        <Indicador etiqueta="Última cohorte" valor={est.ultimaCohorte?.nombre ?? "—"} detalle={est.ultimaCohorte?.nombreFase} />
        <Indicador etiqueta="Último asesor" valor={<span className="text-base">{est.ultimoAsesor?.nombre ?? "Sin asesor"}</span>} detalle={est.ultimoAsesor?.cohorte} acento={!!est.ultimoAsesor} />
      </div>

      {/* Pestañas */}
      <nav className="flex gap-1 border-b border-border">
        {([
          ["resumen", "Resumen", null],
          ["egresados", "Egresados", historial.length],
          ["reportes", "Reportes", vigentes.length],
          ["bitacora", "Bitácora", bitacora.length],
        ] as const).map(([clave, nombre, n]) => (
          <Link
            key={clave}
            href={clave === "resumen" ? `/admin/empresas/${id}` : `/admin/empresas/${id}?vista=${clave}`}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
              vista === clave ? "border-brand-red text-brand-red" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {nombre}
            {n != null && n > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${clave === "reportes" ? "bg-brand-red text-white" : "bg-gray-200 text-gray-700"}`}>{n}</span>
            )}
          </Link>
        ))}
      </nav>

      {vista === "resumen" && (<>
      <Seccion titulo="Valoraciones" detalle="Escala de 1 a 10 · promedio de todos los procesos">
        <SeccionValoraciones v={valoracion} />
      </Seccion>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Seccion titulo="Datos de la institución">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><Dato etiqueta="Descripción">{empresa.descripcion}</Dato></div>
              <div className="md:col-span-2"><Dato etiqueta="Antecedentes">{empresa.antecedentes}</Dato></div>
              <Dato etiqueta="Dirección">{empresa.direccion}</Dato>
              <Dato etiqueta="Ubicación">
                {empresa.mapaUrl && (
                  <a href={enlaceMapa(empresa.mapaUrl)} target="_blank" rel="noreferrer" className="font-semibold text-brand-red hover:underline">Ver en el mapa</a>
                )}
              </Dato>
              <Dato etiqueta="Organigrama">
                {organigrama && (
                  <span className="flex items-center gap-3">
                    <AbrirArchivo url={organigrama} className="font-semibold text-brand-red hover:underline">Ver organigrama</AbrirArchivo>
                    {orgs.length > 1 && <span className="text-xs text-muted">{orgs.length} versiones en el historial</span>}
                  </span>
                )}
              </Dato>
              <Dato etiqueta="Verificada">{empresa.verificada ? "Sí" : "No"}</Dato>
            </dl>
          </Seccion>

          <Seccion titulo="Supervisores y contactos" detalle={cuenta(sups.length, "registrado", "registrados")}>
            {sups.length === 0 ? (
              <p className="text-sm text-muted">Sin supervisores registrados.</p>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-muted border-b border-border">
                    <tr><th className="text-left px-5 py-2">Nombre</th><th className="text-left px-3 py-2">Cargo</th><th className="text-left px-3 py-2">Sede</th><th className="text-left px-3 py-2">Contacto</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sups.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-2.5"><span className="font-semibold text-gray-800">{nombrePersona(s)}</span>{s.especialidad && <p className="text-xs text-muted">{s.especialidad}</p>}</td>
                        <td className="px-3 py-2.5 text-gray-700">{s.cargo || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-700">{nombreSucursal(s.sucursalId)}</td>
                        <td className="px-3 py-2.5 text-gray-700">{[s.telefono, s.correo].filter(Boolean).join(" · ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>

          <Seccion titulo="Firmantes y firmas" detalle={cuenta(firms.length, "registrado", "registrados")}>
            {firms.length === 0 ? (
              <p className="text-sm text-muted">Sin firmantes registrados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {firms.map((f) => (
                  <div key={f.id} className="border border-border rounded-xl p-4 flex gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{nombrePersona(f)}</p>
                      <p className="text-xs text-muted">{f.cargo || "Sin cargo"} · {nombreSucursal(f.sucursalId)}</p>
                      <p className="text-xs text-gray-600 mt-1">{[f.telefono, f.correo].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="w-28 h-14 shrink-0 border border-border rounded-lg bg-gray-50 flex items-center justify-center">
                      {f.firmaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.firmaUrl} alt={`Firma de ${nombrePersona(f)}`} className="max-h-12 max-w-[104px] object-contain" />
                      ) : <span className="text-[10px] text-muted">Sin firma</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Seccion>

          <Seccion titulo="Sucursales" detalle={cuenta(sucs.length, "registrada", "registradas")}>
            {sucs.length === 0 ? (
              <p className="text-sm text-muted">La empresa no tiene sucursales registradas.</p>
            ) : (
              <div className="space-y-4">
                {sucs.map((s) => (
                  <div key={s.id} className="border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800">{s.nombre}</p>
                        <p className="text-xs text-muted">{[s.direccion, s.telefono].filter(Boolean).join(" · ") || "Sin dirección ni teléfono"}</p>
                      </div>
                      {s.mapaUrl && <a href={enlaceMapa(s.mapaUrl)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-red hover:underline shrink-0">Ver en el mapa</a>}
                    </div>
                    {(s.descripcion || s.antecedentes) && (
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {s.descripcion && <Dato etiqueta="Descripción">{s.descripcion}</Dato>}
                        {s.antecedentes && <Dato etiqueta="Antecedentes">{s.antecedentes}</Dato>}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Seccion>
        </div>

        <div className="space-y-6">
          <Seccion titulo="Procesos por modalidad" detalle={`${est.procesos} en total`}>
            <div className="space-y-3">
              {MODALIDADES.map((m) => {
                const n = est.porModalidad[m];
                const pct = est.procesos ? Math.round((n / est.procesos) * 100) : 0;
                return (
                  <div key={m}>
                    <div className="flex justify-between text-sm"><span className="text-gray-700">{NOMBRE_MODALIDAD[m]}</span><span className="font-bold text-gray-800">{n}</span></div>
                    <div className="h-2 rounded-full bg-gray-100 mt-1 overflow-hidden"><div className="h-full bg-brand-red rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Cohortes en que participó" detalle={`${est.cohortes.length}`}>
            {est.cohortes.length === 0 ? (
              <p className="text-sm text-muted">Todavía no participa en ninguna cohorte.</p>
            ) : (
              <ul className="divide-y divide-border -my-2">
                {est.cohortes.map((c) => (
                  <li key={c.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">{c.nombre}</span>
                      <p className={`text-xs ${c.enCurso ? "text-brand-red font-semibold" : "text-muted"}`}>{c.nombreFase}</p>
                    </div>
                    <span className="text-xs text-muted">{c.procesos} {c.procesos === 1 ? "proceso" : "procesos"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion titulo="Asesores que han trabajado con la empresa" detalle={`${est.asesores.length}`}>
            {est.asesores.length === 0 ? (
              <p className="text-sm text-muted">Sin asesores asignados todavía.</p>
            ) : (
              <ul className="divide-y divide-border -my-2">
                {est.asesores.map((a) => (
                  <li key={a.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">{a.nombre}</span>
                      <p className="text-xs text-muted">Última cohorte: {a.ultimaCohorte}</p>
                    </div>
                    <div className="text-right">
                      {est.ultimoAsesor?.id === a.id && <span className="block text-[10px] font-bold uppercase text-brand-red">Último asesor</span>}
                      <span className="text-xs text-muted">{a.procesos} {a.procesos === 1 ? "proceso" : "procesos"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </div>
      </div>

      <Seccion titulo="Egresados que han trabajado en la empresa" detalle={cuenta(historial.length, "registro", "registros")}>
        {historial.length === 0 ? (
          <p className="text-sm text-muted">Ningún egresado ha realizado su proceso en esta empresa.</p>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-700">
              {historial.slice(0, 3).map((h) => h.egresado).join(", ")}
              {historial.length > 3 ? ` y ${historial.length - 3} más` : ""}.
            </p>
            <Link href={`/admin/empresas/${id}?vista=egresados`} className="text-sm font-bold text-brand-red hover:underline">
              Ver historial completo
            </Link>
          </div>
        )}
      </Seccion>
      </>)}

      {vista === "egresados" && (
        <Seccion titulo="Historial de egresados en la empresa" detalle="Cohorte más reciente primero; incluye bajas">
          <TablaHistorial filas={historial} empresa={empresa.nombre} />
        </Seccion>
      )}

      {vista === "reportes" && (
        <div className="space-y-6">
          <Seccion titulo="Nuevo reporte en contra">
            <FormularioReporte
              empresaId={id}
              hoy={hoy}
              procesos={recientes.map((p) => ({
                id: p.propuestaId,
                etiqueta: `${p.cohorte.nombre} · ${NOMBRE_MODALIDAD[p.tipo]} · ${p.egresados.map((e) => e.nombre).join(", ")}`,
              }))}
            />
          </Seccion>
          <Seccion titulo="Reportes registrados" detalle={`${cuenta(vigentes.length, "vigente", "vigentes")} · ${cuenta(reportes.length - vigentes.length, "archivado", "archivados")}`}>
            {reportes.length === 0 ? (
              <p className="text-sm text-muted">No hay reportes en contra de esta empresa.</p>
            ) : (
              <ul className="space-y-4">
                {reportes.map((r) => {
                  const proceso = r.propuestaId ? recientes.find((p) => p.propuestaId === r.propuestaId) : null;
                  return (
                    <li key={r.id} className={`rounded-xl border p-4 ${r.estado === "vigente" ? "border-brand-red/30 bg-red-50/30" : "border-border bg-gray-50"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${r.estado === "vigente" ? "bg-brand-red text-white" : "bg-gray-200 text-gray-600"}`}>
                              {r.estado === "vigente" ? "Vigente" : "Archivado"}
                            </span>
                            <span className="text-sm font-bold text-gray-800">{fechaLarga(r.fecha)}</span>
                            <span className="text-xs text-muted">Reporta: {NOMBRE_ORIGEN[r.origen]}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{r.descripcion}</p>
                          <p className="text-xs text-muted mt-2">
                            {proceso && <>Proceso: {proceso.cohorte.nombre} · {NOMBRE_MODALIDAD[proceso.tipo]} · {proceso.egresados.map((e) => e.nombre).join(", ")} · </>}
                            Registrado por {r.registradoPor ?? "la administración"} el {fechaLarga(r.creadoEn)}
                          </p>
                          {r.archivo && (
                            <AbrirArchivo url={r.archivo.url} className="mt-2 text-xs font-semibold text-brand-red hover:underline">
                              Ver evidencia: {r.archivo.nombre}
                            </AbrirArchivo>
                          )}
                        </div>
                        {r.estado === "vigente" && <div className="shrink-0"><BotonArchivarReporte reporteId={r.id} /></div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Seccion>
        </div>
      )}

      {vista === "bitacora" && (
        <Seccion titulo="Bitácora de la empresa" detalle="Decisiones, reportes y cambios de datos, del más reciente al más antiguo">
          {bitacora.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay movimientos registrados.</p>
          ) : (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {bitacora.map((ev) => {
                const reporte = ev.reporteId ? reportes.find((r) => r.id === ev.reporteId) : null;
                const punto = ev.tono === "alerta" ? "bg-brand-red" : ev.tono === "positivo" ? "bg-green-600" : "bg-gray-400";
                return (
                  <li key={ev.id} className="pl-5 relative">
                    <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${punto}`} />
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className={`font-bold text-sm ${ev.tono === "alerta" ? "text-brand-red" : ev.tono === "positivo" ? "text-green-700" : "text-gray-800"}`}>{ev.titulo}</span>
                      <span className="text-xs text-muted">{fechaLarga(ev.fecha)}, {horaCorta(ev.fecha)}{ev.autor ? ` · ${ev.autor}` : ""}</span>
                    </div>
                    {ev.detalle && (
                      <div className={`text-sm mt-1 whitespace-pre-line ${ev.tipo === "estado" ? "text-gray-800 bg-gray-50 border border-border rounded-lg p-3" : "text-gray-600"}`}>
                        {ev.tipo === "estado" && <span className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">Motivo</span>}
                        {ev.detalle}
                      </div>
                    )}
                    {reporte && (
                      <p className="text-xs text-muted mt-1">
                        {ev.tipo === "estado" ? "Motivado por el reporte" : "Reporte"} del {fechaLarga(reporte.fecha)} ({NOMBRE_ORIGEN[reporte.origen]}): {reporte.descripcion.slice(0, 120)}{reporte.descripcion.length > 120 ? "..." : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Seccion>
      )}
    </div>
  );
}
