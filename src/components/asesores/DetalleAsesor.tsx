// Detalle de un asesor (entrega V5): récord de valoraciones, procesos, bitácora e historial como egresado.
// Lo usan el administrador (con acciones) y el coordinador (solo lectura).

import Link from "next/link";
import type { DetalleAsesor } from "@/lib/asesoresServidor";
import { NOMBRE_MODALIDAD } from "@/lib/estadisticasEmpresas";
import { formatoNota } from "@/lib/valoraciones";
import Nota from "@/components/valoraciones/Nota";
import BotonEstadoAsesor from "./BotonEstadoAsesor";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });
const NOMBRE_ESTADO = { en_curso: "En curso", cerrado: "Cerrado", baja: "Dado de baja" } as const;
const CLASE_ESTADO = {
  en_curso: "bg-blue-50 text-blue-800 border-blue-200",
  cerrado: "bg-green-100 text-green-800 border-green-200",
  baja: "bg-gray-800 text-white border-gray-800",
} as const;

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

function Indicador({ etiqueta, valor, detalle }: { etiqueta: string; valor: React.ReactNode; detalle?: string }) {
  return (
    <div className="rounded-xl border border-border p-4 bg-white shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{etiqueta}</p>
      <div className="mt-1 text-xl font-bold text-gray-800">{valor}</div>
      {detalle && <p className="text-xs text-muted mt-0.5">{detalle}</p>}
    </div>
  );
}

export default function DetalleAsesorVista({ d, rutaBase, gestionar }: { d: DetalleAsesor; rutaBase: string; gestionar: boolean }) {
  const f = d.fila;
  return (
    <div className="space-y-6">
      <div>
        <Link href={rutaBase} className="text-sm font-semibold text-muted hover:text-brand-red transition-colors">Volver a asesores</Link>
        <div className="mt-3 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">{f.nombre}</h1>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${f.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{f.activo ? "Activo" : "Inactivo"}</span>
            </div>
            <p className="text-sm text-muted mt-1">{f.correo}</p>
            <p className="text-sm text-gray-700 mt-1">{f.carreras.length ? f.carreras.join(" · ") : "Sin carrera asignada"}</p>
          </div>
          {gestionar && (
            <div className="flex gap-2 shrink-0">
              <BotonEstadoAsesor asesor={{ id: f.id, nombre: f.nombre, activo: f.activo, nota: f.nota.promedio, procesosActivos: f.procesosActivos }} />
              <Link href={`/admin/usuarios/${f.id}/editar`} className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors">Editar datos</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Indicador etiqueta="Nota histórica" valor={<Nota valor={f.nota.promedio} vacio="Sin valoraciones" grande={f.nota.promedio != null} />} detalle={f.nota.procesos ? `${f.nota.procesos} ${f.nota.procesos === 1 ? "proceso valorado" : "procesos valorados"}` : undefined} />
        <Indicador etiqueta="Última evaluación" valor={f.nota.ultima ? formatoNota(f.nota.ultima.promedio) : "—"} detalle={f.nota.ultima ? f.nota.ultima.cohorte : undefined} />
        <Indicador etiqueta="En curso" valor={f.procesosActivos} />
        <Indicador etiqueta="Cerrados" valor={f.procesosCerrados} detalle={f.bajas ? `${f.bajas} ${f.bajas === 1 ? "baja" : "bajas"}` : undefined} />
        <Indicador etiqueta="Cohortes" valor={f.cohortes.length} detalle={f.cohortes[0] ? `Última: ${f.cohortes[0]}` : undefined} />
        <Indicador etiqueta="Empresas" valor={f.empresas} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Seccion titulo="Valoraciones de los egresados" detalle="Escala de 1 a 10 · promedio de todos sus procesos">
            {f.nota.procesos === 0 ? (
              <p className="text-sm text-muted">Todavía no tiene valoraciones. Los egresados lo valoran al cerrar cada proceso.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Por aspecto</p>
                  {f.nota.porAspecto.map((a) => (
                    <div key={a.clave}>
                      <div className="flex justify-between text-xs"><span className="text-gray-600">{a.nombre}</span><span className="font-bold text-gray-800">{formatoNota(a.promedio)}</span></div>
                      <div className="h-1.5 rounded-full bg-gray-100 mt-0.5 overflow-hidden"><div className="h-full bg-brand-red rounded-full" style={{ width: `${((a.promedio ?? 0) / 10) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">Por cohorte</p>
                  <ul className="divide-y divide-border">
                    {d.porCohorte.map((c) => (
                      <li key={c.cohorte} className="py-1.5 flex justify-between items-center text-sm">
                        <span className="text-gray-700">{c.cohorte}</span>
                        <span className="flex items-center gap-2">
                          {c.valoraciones > 0 && <span className="text-[11px] text-muted">{c.valoraciones} {c.valoraciones === 1 ? "valoración" : "valoraciones"}</span>}
                          <Nota valor={c.promedio} vacio="—" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {d.comentarios.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">Comentarios de los egresados</p>
                <ul className="space-y-2">
                  {d.comentarios.slice(0, 10).map((c, i) => (
                    <li key={i} className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg p-3">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted mb-1">{c.cohorte} · nota {formatoNota(c.nota)}</span>
                      {c.texto}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Seccion>

          <Seccion titulo="Procesos asesorados" detalle="Cohorte más reciente primero">
            {d.procesos.length === 0 ? (
              <p className="text-sm text-muted">Todavía no tiene procesos asignados.</p>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-muted border-b border-border">
                    <tr>
                      <th className="text-left px-5 py-2">Proceso</th>
                      <th className="text-left px-3 py-2">Empresa</th>
                      <th className="text-left px-3 py-2">Estado</th>
                      <th className="text-center px-3 py-2">Nota recibida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {d.procesos.map((p) => (
                      <tr key={p.propuestaId} className="align-top">
                        <td className="px-5 py-2.5">
                          <p className="font-semibold text-gray-800">{p.egresados.join(", ")}</p>
                          <p className="text-xs text-muted">{p.cohorte} · {NOMBRE_MODALIDAD[p.modalidad]}</p>
                          <p className="text-xs text-gray-500 line-clamp-1 max-w-[360px]" title={p.titulo}>{p.titulo}</p>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700">
                          {p.empresa ? (gestionar ? <Link href={`/admin/empresas/${p.empresa.id}`} className="hover:text-brand-red hover:underline">{p.empresa.nombre}</Link> : p.empresa.nombre) : <span className="text-muted">Sin empresa</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded-md border whitespace-nowrap ${CLASE_ESTADO[p.estado]}`}>{NOMBRE_ESTADO[p.estado]}</span>
                          {p.cerradoEn && <p className="text-[11px] text-muted mt-1">{fecha(p.cerradoEn)}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-center"><Nota valor={p.notaRecibida} vacio="—" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>
        </div>

        <div className="space-y-6">
          <Seccion titulo="Bitácora" detalle="Habilitar y deshabilitar">
            {d.bitacora.length === 0 ? (
              <p className="text-sm text-muted">Sin movimientos registrados.</p>
            ) : (
              <ol className="relative border-l-2 border-border ml-2 space-y-4">
                {d.bitacora.map((e) => (
                  <li key={e.id} className="pl-4 relative">
                    <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${e.activo ? "bg-green-600" : "bg-brand-red"}`} />
                    <p className={`text-sm font-bold ${e.activo ? "text-green-700" : "text-brand-red"}`}>{e.activo ? "Habilitado" : "Deshabilitado"}</p>
                    <p className="text-xs text-muted">{fecha(e.fecha)}{e.autor ? ` · ${e.autor}` : ""}{e.origen === "usuarios" ? " · desde Usuarios" : ""}</p>
                    <p className="text-sm text-gray-700 mt-1">{e.motivo}</p>
                  </li>
                ))}
              </ol>
            )}
          </Seccion>

          {d.comoEgresado.length > 0 && (
            <Seccion titulo="Historial como egresado" detalle="Trabajo de graduación de esta misma cuenta">
              <ul className="divide-y divide-border -my-2">
                {d.comoEgresado.map((p) => (
                  <li key={p.propuestaId} className="py-2 text-sm">
                    <p className="font-semibold text-gray-800">{p.titulo}</p>
                    <p className="text-xs text-muted">{p.cohorte} · {NOMBRE_MODALIDAD[p.modalidad as keyof typeof NOMBRE_MODALIDAD] ?? p.modalidad} · {p.estado.replace(/_/g, " ")}</p>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}
