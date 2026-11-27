// Revisar propuesta (administración). A1 de specs/REVISAR_PROPUESTA_ADMIN.md: expediente en tarjetas, en el orden en
// que se revisa (equipo, requisitos previos, contenido, historial), con el panel de gestión fijo al costado.
// La administración revisa estructura y requisitos para asignar; el contenido lo revisa el asesor.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoordinadoresConEstadisticas } from "@/app/actions/adminPropuestas";
import { getHistorialCompletoProyecto } from "@/app/actions/coordinador";
import ReviewForm from "./ReviewForm";
import HistorialProyectoAccordion from "@/components/HistorialProyectoAccordion";
import ValoracionesDelProceso from "@/components/valoraciones/ValoracionesDelProceso";
import FortalezaResumen from "@/components/fortaleza/FortalezaResumen";
import ConstanciaSinSupervisor from "@/components/revisarPropuesta/ConstanciaSinSupervisor";
import DocumentoPlegable from "@/components/revisarPropuesta/DocumentoPlegable";
import { Dato, Persona, Tarjeta } from "@/components/revisarPropuesta/PiezasExpediente";
import { opcionesAsesor, reglaDePropuesta, ultimaSolicitudAsesor } from "@/lib/asignacionServidor";
import { alcanceAdmin, puedeAsignarPropuesta, puedeVerPropuesta } from "@/lib/permisos";
import { expedientePropuesta, rechazosDePropuesta } from "@/lib/expedientePropuesta";
import { puedeRechazarEnEstado } from "@/lib/rechazoPropuesta";
import { puedeEliminarEnEstado } from "@/lib/eliminarPropuesta";
import VerificarFirmas from "@/components/revisarPropuesta/VerificarFirmas";
import { estadoVerificacionFirmas, type EstadoVerificacionFirmas } from "@/lib/verificacionFirmasServidor";
import { requisitosAsignacion } from "@/lib/requisitosAsignacionServidor";
import { nombreEstado } from "@/lib/historialEstados";
import { fechaCortaSV, fechaLargaSV } from "@/lib/fechasTexto";

const TIPO: Record<string, string> = { proyecto: "Proyecto", investigacion: "Investigación", pasantia: "Pasantía" };

export default async function AdminPropuestaReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const pId = parseInt((await params).id, 10);
  if (isNaN(pId)) redirect("/admin/propuestas");

  // Administrador de facultad (C3): solo propuestas de su facultad; asigna solo si la cohorte lo tiene como administrador
  const alcance = await alcanceAdmin();
  if (!alcance) redirect("/login");
  if (!(await puedeVerPropuesta(alcance, pId))) redirect("/admin/propuestas");
  const puedeAsignar = await puedeAsignarPropuesta(alcance, pId);

  const exp = await expedientePropuesta(pId);
  if (!exp) redirect("/admin/propuestas");
  const { propuesta, integrantes, empresa, carta, contenido } = exp;
  const esEquipo = integrantes.length > 1;
  const docsFaltantes = integrantes.reduce((n, i) => n + i.documentos.filter((d) => !d.url).length, 0);

  const historialRes = await getHistorialCompletoProyecto(propuesta.id);
  const historialList = historialRes.success ? historialRes.data : [];

  // Entrega C2: coordinadores (o asesores, si no hay coordinador) según la configuración de la cohorte
  const regla = await reglaDePropuesta(propuesta.id);
  const soloIds = regla?.configurada ? [...(regla.coordinadores ?? []), ...(regla.adminFacultadId ? [regla.adminFacultadId] : [])] : null;
  const coordRes = await getCoordinadoresConEstadisticas(propuesta.empresaId, soloIds);
  const coordinadoresList = coordRes.success ? coordRes.data : [];
  const asesoresDirecto = regla?.sinCoordinador ? await opcionesAsesor(regla) : [];
  const ultimaSolicitud = await ultimaSolicitudAsesor(propuesta.id);
  // A2: la administración rechaza por requisitos solo antes de asignar
  const puedeRechazar = puedeAsignar && puedeRechazarEnEstado("administracion", propuesta);
  // A4: firmas de la carta verificadas a simple vista (solo registro y aviso)
  const firmas: EstadoVerificacionFirmas = await estadoVerificacionFirmas(propuesta.id).catch(() => ({ verificada: null, cambioDespues: false, quien: null, fecha: null }));
  // D1: requisitos para asignar (solo mientras espera asignación)
  const requisitos = ["enviada", "coordinador_asignado"].includes(propuesta.estado) ? await requisitosAsignacion(propuesta.id).catch(() => null) : null;
  const rechazos = await rechazosDePropuesta(propuesta.id, Object.fromEntries(integrantes.map((i) => [i.id, i.nombre]))).catch(() => []);

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/propuestas" className="text-xs font-bold text-gray-500 hover:text-brand-red">
            ← Volver a Propuestas
          </Link>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/admin/propuestas/${propuesta.id}/imprimir`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red"
            >
              Ver documento completo
            </a>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-red">
              Propuesta #{propuesta.numero} · {TIPO[propuesta.tipo] ?? propuesta.tipo}
            </p>
            <h1 className="text-xl font-bold text-card-dark mt-1 leading-snug">{propuesta.titulo || "Sin título"}</h1>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">{nombreEstado(propuesta.estado)}</span>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
          <Dato etiqueta="Cohorte" valor={regla?.cohorte} />
          <Dato etiqueta="Facultad" valor={exp.facultad} />
          <Dato etiqueta="Carrera" valor={integrantes[0]?.carrera} />
          <Dato etiqueta="Enviada" valor={propuesta.enviadaEn ? fechaCortaSV(propuesta.enviadaEn.toISOString()) : "No enviada"} />
        </dl>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Expediente */}
        <div className="lg:col-span-8 space-y-6">
          <Tarjeta numero={1} titulo={esEquipo ? `Equipo (${integrantes.length} integrantes)` : "Egresado"}>
            <ul className="divide-y divide-border">
              {integrantes.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-card-dark">
                      {i.nombre}
                      {i.esLider && esEquipo && <span className="ml-2 rounded bg-red-50 px-1.5 py-px text-[10px] font-bold text-brand-red">Líder</span>}
                    </p>
                    <p className="text-xs text-muted">{i.correo}{i.carrera ? ` · ${i.carrera}` : ""}</p>
                  </div>
                  <span className="font-mono text-xs text-gray-600">{i.carnet ?? "Sin carnet"}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta
            numero={2}
            titulo="Requisitos previos"
            descripcion="Revisa que cada documento sea el correcto antes de asignar la propuesta."
            accion={
              docsFaltantes > 0 ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {docsFaltantes} documento{docsFaltantes > 1 ? "s" : ""} sin subir
                </span>
              ) : (
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-800">Documentos completos</span>
              )
            }
          >
            <div className="space-y-6">
              {integrantes.map((i) => (
                <div key={i.id} className="space-y-2">
                  <h3 className="text-sm font-bold text-card-dark">
                    Documentos de soporte{esEquipo ? ` · ${i.nombre}` : ""}
                  </h3>
                  {i.documentos.map((d) => (
                    <DocumentoPlegable key={d.tipo} nombre={d.nombre} url={d.url} subidoEn={d.subidoEn} />
                  ))}
                </div>
              ))}

              <div className="space-y-3 pt-5 border-t border-border">
                <h3 className="text-sm font-bold text-card-dark">Empresa y carta de aceptación</h3>
                {empresa ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
                    <Dato etiqueta="Empresa" valor={`${empresa.nombre}${empresa.sucursal ? ` · ${empresa.sucursal}` : ""}`} />
                    <Dato etiqueta="Dirección" valor={empresa.direccion} />
                  </dl>
                ) : (
                  <p className="text-sm text-muted">Sin empresa seleccionada.</p>
                )}
                {carta ? (
                  <>
                    <dl className="grid grid-cols-3 gap-4">
                      <Dato etiqueta="Emisión" valor={carta.fechaEmision ? fechaLargaSV(carta.fechaEmision) : null} />
                      <Dato etiqueta="Inicio" valor={carta.fechaInicio ? fechaLargaSV(carta.fechaInicio) : null} />
                      <Dato etiqueta="Fin" valor={carta.fechaFin ? fechaLargaSV(carta.fechaFin) : null} />
                    </dl>
                    <DocumentoPlegable nombre="Carta de aceptación" url={carta.archivoUrl} />
                    {carta.archivoUrl && (
                      <VerificarFirmas
                        propuestaId={propuesta.id}
                        numero={propuesta.numero}
                        empresa={empresa ? `${empresa.nombre}${empresa.sucursal ? ` · ${empresa.sucursal}` : ""}` : null}
                        cartaUrl={carta.archivoUrl}
                        firmantes={carta.firmantes}
                        supervisor={carta.supervisor}
                        sinSupervisor={carta.sinSupervisor}
                        estado={firmas}
                        rechazo={puedeRechazar ? { integrantes: integrantes.map((i) => ({ id: i.id, nombre: i.nombre })) } : null}
                      />
                    )}
                    <div className="space-y-2">
                      {carta.firmantes.map((f) => <Persona key={f.id} p={f} rol="Firmante" />)}
                      {carta.supervisor && <Persona p={carta.supervisor} rol="Supervisor empresarial" />}
                      {carta.sinSupervisor && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Sin supervisor empresarial</p>
                          <p className="text-gray-800">{carta.motivoSinSupervisor}</p>
                        </div>
                      )}
                      {carta.supervisorEscrito && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Supervisor escrito en la carta:</span> {carta.supervisorEscrito}
                        </p>
                      )}
                      {carta.firmantes.length === 0 && !carta.supervisor && !carta.sinSupervisor && !carta.supervisorEscrito && (
                        <p className="text-sm text-muted">El egresado todavía no eligió firmantes ni supervisor.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">Sin carta de aceptación registrada.</p>
                )}
              </div>
            </div>
          </Tarjeta>

          <Tarjeta numero={3} titulo="Contenido" descripcion="Resumen para ubicar la propuesta; la revisión del contenido la hace el asesor.">
            <div className="space-y-4">
              {contenido.objetivoGeneral && <Dato etiqueta="Objetivo general" valor={contenido.objetivoGeneral} />}
              {contenido.objetivosEspecificos.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Objetivos específicos ({contenido.objetivosEspecificos.length})</p>
                  <ol className="mt-1 list-decimal pl-5 space-y-1 text-sm text-gray-800">
                    {contenido.objetivosEspecificos.map((o, i) => (
                      <li key={i}>
                        {o.titulo && <span className="font-semibold">{o.titulo}: </span>}
                        {o.descripcion}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {exp.actividades.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Cronograma ({exp.actividades.length} actividades)</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">Mes</th>
                          <th className="px-3 py-2 text-left">Semana</th>
                          <th className="px-3 py-2 text-left">Actividad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {exp.actividades.map((a) => (
                          <tr key={a.id}>
                            <td className="px-3 py-1.5">{a.periodo}</td>
                            <td className="px-3 py-1.5">{a.semana}</td>
                            <td className="px-3 py-1.5">{a.titulo || a.descripcion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <ConstanciaSinSupervisor propuestaId={propuesta.id} />
              <FortalezaResumen propuestaId={propuesta.id} paraAsesor />
              <a href={`/admin/propuestas/${propuesta.id}/imprimir`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-brand-red hover:underline">
                Ver el documento completo de la propuesta
              </a>
            </div>
          </Tarjeta>

          {rechazos.length > 0 && (
            <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <header className="px-5 py-4 border-b border-border">
                <h2 className="font-bold text-card-dark">Rechazos por requisitos ({rechazos.length})</h2>
                <p className="text-xs text-muted mt-0.5">Veces que la propuesta volvió al egresado antes de asignarse.</p>
              </header>
              <ul className="divide-y divide-border">
                {rechazos.map((r) => (
                  <li key={r.id} className="px-5 py-3 text-sm space-y-1">
                    <p className="text-xs text-muted">
                      {fechaCortaSV(r.fecha)} · {r.funcion === "coordinador" ? "Coordinador" : "Administración"}{r.quien ? ` · ${r.quien}` : ""}
                    </p>
                    <ul className="list-disc pl-5 text-gray-800">
                      {r.motivos.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                    <p className="text-gray-700">{r.mensaje}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <HistorialProyectoAccordion historial={historialList} />
          <ValoracionesDelProceso propuestaId={propuesta.id} />
        </div>

        {/* Gestión */}
        <div className="lg:col-span-4 lg:sticky lg:top-6">
          <ReviewForm
            propuestaId={propuesta.id}
            estadoActual={propuesta.estado}
            coordinadores={coordinadoresList}
            initialCoordinadorId={propuesta.coordinadorId}
            regla={
              regla
                ? {
                    cohorte: regla.cohorte,
                    periodoId: regla.periodoId,
                    facultad: regla.facultad?.nombre ?? null,
                    carrera: regla.carrera?.nombre ?? null,
                    configurada: regla.configurada,
                    texto: regla.regla,
                    sinCoordinador: regla.sinCoordinador,
                    adminFacultadId: regla.adminFacultadId,
                  }
                : null
            }
            asesoresDirecto={asesoresDirecto}
            ultimaSolicitud={ultimaSolicitud}
            tieneAsesor={!!propuesta.asesorId}
            puedeAsignar={puedeAsignar}
            superadmin={alcance.superadmin}
            requisitos={requisitos}
            eliminacion={{ numero: propuesta.numero, titulo: propuesta.titulo, integrantes: integrantes.map((i) => i.nombre), permitido: puedeEliminarEnEstado(propuesta.estado) }}
            rechazo={puedeRechazar ? { numero: propuesta.numero, integrantes: integrantes.map((i) => ({ id: i.id, nombre: i.nombre })) } : null}
          />
        </div>
      </div>
    </div>
  );
}
