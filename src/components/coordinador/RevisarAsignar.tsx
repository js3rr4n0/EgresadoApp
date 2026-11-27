// D4 (specs/COORDINADOR_ASIGNACION.md): vista única «Revisar y asignar» del coordinador, para propuestas que todavía no
// tienen asesor. Arriba lo que ya verificaron el sistema y la administración; luego el documento de la propuesta y su
// expediente para la revisión del coordinador; al lado, la asignación del asesor y el rechazo por requisitos.

import Link from "next/link";
import { getAsesoresFacultad, getHistorialCompletoProyecto } from "@/app/actions/coordinador";
import { expedientePropuesta, rechazosDePropuesta } from "@/lib/expedientePropuesta";
import { requisitosAsignacion } from "@/lib/requisitosAsignacionServidor";
import { reglaDePropuesta, ultimaSolicitudAsesor } from "@/lib/asignacionServidor";
import { estadoVerificacionFirmas } from "@/lib/verificacionFirmasServidor";
import { nombreEstado } from "@/lib/historialEstados";
import { fechaCortaSV, fechaLargaSV } from "@/lib/fechasTexto";
import { Dato, Persona, Tarjeta } from "@/components/revisarPropuesta/PiezasExpediente";
import DocumentoPlegable from "@/components/revisarPropuesta/DocumentoPlegable";
import ListaRequisitos from "@/components/revisarPropuesta/ListaRequisitos";
import ConstanciaSinSupervisor from "@/components/revisarPropuesta/ConstanciaSinSupervisor";
import FortalezaResumen from "@/components/fortaleza/FortalezaResumen";
import HistorialProyectoAccordion from "@/components/HistorialProyectoAccordion";
import PanelAsignacion, { type OpcionAsesorPanel } from "./PanelAsignacion";

const TIPO: Record<string, string> = { proyecto: "Proyecto", investigacion: "Investigación", pasantia: "Pasantía" };

export default async function RevisarAsignar({ propuestaId }: { propuestaId: number }) {
  const exp = await expedientePropuesta(propuestaId);
  if (!exp) return <p className="text-sm text-muted">La propuesta no existe.</p>;
  const { propuesta, integrantes, empresa, carta } = exp;
  const esEquipo = integrantes.length > 1;

  const [requisitos, regla, solicitud, asesoresRes, historialRes, firmas] = await Promise.all([
    requisitosAsignacion(propuestaId).catch(() => null),
    reglaDePropuesta(propuestaId),
    ultimaSolicitudAsesor(propuestaId),
    getAsesoresFacultad(propuestaId),
    getHistorialCompletoProyecto(propuestaId),
    estadoVerificacionFirmas(propuestaId).catch(() => null),
  ]);
  const rechazos = await rechazosDePropuesta(propuestaId, Object.fromEntries(integrantes.map((i) => [i.id, i.nombre]))).catch(() => []);
  const asesores = (asesoresRes.success && Array.isArray(asesoresRes.data) ? asesoresRes.data : []) as OpcionAsesorPanel[];
  const historial = historialRes.success ? historialRes.data : [];
  const docsFaltantes = integrantes.reduce((n, i) => n + i.documentos.filter((d) => !d.url).length, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Encabezado */}
      <div className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/coordinador" className="text-xs font-bold text-gray-500 hover:text-brand-red">
            ← Volver a Por revisar y asignar
          </Link>
          <a
            href={`/coordinador/propuestas/${propuestaId}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red"
          >
            Abrir el documento en otra pestaña
          </a>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-red">
              Revisar y asignar · Propuesta #{propuesta.numero} · {TIPO[propuesta.tipo] ?? propuesta.tipo}
            </p>
            <h1 className="mt-1 text-xl font-bold leading-snug text-card-dark">{propuesta.titulo || "Sin título"}</h1>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">{nombreEstado(propuesta.estado)}</span>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-border pt-3 md:grid-cols-4">
          <Dato etiqueta="Cohorte" valor={regla?.cohorte} />
          <Dato etiqueta="Carrera" valor={integrantes[0]?.carrera} />
          <Dato etiqueta="Empresa" valor={empresa ? `${empresa.nombre}${empresa.sucursal ? ` · ${empresa.sucursal}` : ""}` : null} />
          <Dato etiqueta="Enviada" valor={propuesta.enviadaEn ? fechaCortaSV(propuesta.enviadaEn.toISOString()) : "No enviada"} />
        </dl>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* 1. Lo que ya se verificó */}
          <Tarjeta
            numero={1}
            titulo="Verificado antes de asignar"
            descripcion="Lo revisaron el sistema y la administración antes de que la propuesta llegara a coordinación."
            accion={
              requisitos ? (
                requisitos.listo ? (
                  <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-800">Todo verificado</span>
                ) : (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-800">Requisitos incompletos</span>
                )
              ) : null
            }
          >
            <div className="space-y-4">
              {requisitos && <ListaRequisitos requisitos={requisitos.requisitos} />}
              <ConstanciaSinSupervisor propuestaId={propuestaId} />
              <FortalezaResumen propuestaId={propuestaId} paraAsesor />
            </div>
          </Tarjeta>

          {/* 2. El documento: lo que revisa el coordinador */}
          <Tarjeta
            numero={2}
            titulo="Documento de la propuesta"
            descripcion="Revisa que el planteamiento sea claro, que los objetivos sean SMART, que estén los actores e involucrados y que los datos de la carta sean adecuados."
          >
            <iframe
              src={`/coordinador/propuestas/${propuestaId}/imprimir?embebido=1`}
              title={`Documento de la propuesta #${propuesta.numero}`}
              className="h-[75vh] w-full rounded-lg border border-border bg-white"
            />
          </Tarjeta>

          {/* 3. Equipo */}
          <Tarjeta numero={3} titulo={esEquipo ? `Equipo (${integrantes.length} integrantes)` : "Egresado"}>
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

          {/* 4. Empresa y carta */}
          <Tarjeta numero={4} titulo="Empresa y carta de aceptación" descripcion="Fechas, supervisor empresarial y quién firma.">
            <div className="space-y-3">
              {empresa ? (
                <dl className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-3 sm:grid-cols-2">
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
                  <DocumentoPlegable
                    nombre="Carta de aceptación"
                    url={carta.archivoUrl}
                    detalle={firmas?.verificada ? `Firmas verificadas${firmas.quien ? ` por ${firmas.quien}` : ""}` : "Firmas sin verificar"}
                  />
                  <div className="space-y-2">
                    {carta.firmantes.map((f) => <Persona key={f.id} p={f} rol="Firmante" />)}
                    {carta.supervisor && <Persona p={carta.supervisor} rol="Supervisor empresarial" />}
                    {carta.supervisorEscrito && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Supervisor escrito en la carta:</span> {carta.supervisorEscrito}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">Sin carta de aceptación registrada.</p>
              )}
            </div>
          </Tarjeta>

          {/* 5. Documentos de soporte */}
          <Tarjeta
            numero={5}
            titulo="Documentos de soporte"
            accion={
              docsFaltantes > 0 ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {docsFaltantes} sin subir
                </span>
              ) : (
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-800">Completos</span>
              )
            }
          >
            <div className="space-y-5">
              {integrantes.map((i) => (
                <div key={i.id} className="space-y-2">
                  {esEquipo && <h3 className="text-sm font-bold text-card-dark">{i.nombre}</h3>}
                  {i.documentos.map((d) => (
                    <DocumentoPlegable key={d.tipo} nombre={d.nombre} url={d.url} subidoEn={d.subidoEn} />
                  ))}
                </div>
              ))}
            </div>
          </Tarjeta>

          {rechazos.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <header className="border-b border-border px-5 py-4">
                <h2 className="font-bold text-card-dark">Rechazos por requisitos ({rechazos.length})</h2>
                <p className="mt-0.5 text-xs text-muted">Veces que la propuesta volvió al egresado antes de asignarse.</p>
              </header>
              <ul className="divide-y divide-border">
                {rechazos.map((r) => (
                  <li key={r.id} className="space-y-1 px-5 py-3 text-sm">
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

          <HistorialProyectoAccordion historial={historial} />
        </div>

        <div className="lg:sticky lg:top-6 lg:col-span-4">
          <PanelAsignacion
            propuestaId={propuestaId}
            numero={propuesta.numero}
            integrantes={integrantes.map((i) => ({ id: i.id, nombre: i.nombre }))}
            asesores={asesores}
            regla={regla?.configurada ? regla.regla : null}
            requisitosListo={!!requisitos?.listo}
            solicitud={solicitud ? { estado: solicitud.estado, asesor: solicitud.asesor, justificacion: solicitud.justificacion, creadaEn: solicitud.creadaEn, respondidoEn: solicitud.respondidoEn } : null}
          />
        </div>
      </div>
    </div>
  );
}
