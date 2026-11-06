// Documento del informe del período del proyecto (entrega P5): individual (un integrante) o general (el equipo).
// Componente de servidor: arma el contenido con el plan y los registros (lib/fichas/informePeriodo.ts).
// La redacción exacta de cada parte se revisará después (nota del documento "Ejemplo para plantilla proyecto").
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { detallesProyecto, propuestas, usuarios } from "@/lib/schema";
import { getEjecucionProyecto } from "@/app/actions/ejecucionProyecto";
import { armarInformePeriodo, numerarEvidencias } from "@/lib/fichas/informePeriodo";
import { getEvidenciasRegistro, type EvidenciaCompleta } from "@/app/actions/evidenciasPlan";
import { notaImagen } from "@/lib/fuenteImagen";
import { leyendaDocumento } from "@/lib/reglasRegistroActividad";
import BotonImprimir from "./BotonImprimir";

const dinero = (v: number) => (v ? `$${v.toLocaleString("es-SV")}` : "");
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
// Sin el punto final del título, para que no quede ".:" al encadenar el texto del avance.
const sinPunto = (t: string) => t.replace(/[.\s]+$/, "");
const sangria = (nivel: number) => ({ paddingLeft: `${(nivel - 1) * 1}rem` });

export default async function InformePeriodoProyecto({ propuestaId, periodo, de, volver }: { propuestaId: number; periodo: number; de: string; volver: string }) {
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return <p className="p-8 text-center text-sm text-muted">{res.error}</p>;
  const { plan, registros, periodos, informes, reglas } = res.datos;
  const integrante = de === "general" ? null : Number(de);
  if (integrante !== null && !plan.equipo.some((i) => i.id === integrante)) return <p className="p-8 text-center text-sm text-muted">Integrante no válido.</p>;
  if (!Number.isInteger(periodo) || periodo < 1 || periodo > periodos.length) return <p className="p-8 text-center text-sm text-muted">Período no válido.</p>;

  const inf = armarInformePeriodo({ arbol: plan.plan.arbol, columnas: plan.columnas, periodo, registros, integrante, arrastre: reglas.avance });
  const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const [prop] = await db.select({ asesorId: propuestas.asesorId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  const [asesor] = prop?.asesorId ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.asesorId)) : [];
  const p = periodos[periodo - 1];
  const autores = integrante === null ? plan.equipo : plan.equipo.filter((i) => i.id === integrante);
  const nombre = (id: number | null) => plan.equipo.find((i) => i.id === id)?.nombre ?? "";
  const estado = informes.find((i) => i.periodo === periodo && i.egresadoId === integrante);
  const actividades = inf.filas.filter((f) => f.registro);
  // Evidencias de las actividades registradas en el período, numeradas en el orden del plan.
  const regIds = new Map(registros.filter((r) => r.periodo === periodo).map((r) => [r.nodoId, r.id]));
  const todas = await getEvidenciasRegistro(propuestaId, actividades.map((f) => regIds.get(f.id)).filter((x): x is number => x !== undefined));
  const porActividad = new Map<string, EvidenciaCompleta[]>(actividades.map((f) => [f.id, todas.filter((e) => e.registroId === regIds.get(f.id))]));
  const evidencias = numerarEvidencias(actividades, porActividad);
  const listaEvidencias = actividades.flatMap((f) => (evidencias.get(f.id) ?? []).map((e) => ({ ...e, codigo: f.codigo })));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={volver} className="text-sm text-gray-500 hover:text-brand-red">← Volver a la ejecución</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{estado ? `Estado: ${estado.estado}` : "Vista previa: todavía no entregado"}</span>
          <BotonImprimir />
        </div>
      </div>

      <article className="bg-white border border-border rounded-xl shadow-xs p-8 space-y-8 text-sm text-gray-800 print:border-0 print:shadow-none print:p-0">
        {/* 1. Portada */}
        <section className="text-center space-y-3 border-b border-gray-200 pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/unicaes-logo.png" alt="UNICAES" className="w-24 h-24 object-contain mx-auto" />
          <p className="font-bold uppercase tracking-wide">Universidad Católica de El Salvador</p>
          <p className="uppercase text-xs">Trabajo de graduación · Modalidad proyecto</p>
          <h1 className="text-lg font-bold uppercase mt-4">{integrante === null ? "Informe general" : "Informe individual"} de avances del período {periodo}</h1>
          <p className="font-bold">{plan.propuesta.titulo}</p>
          <p className="text-xs">Del {fecha(p?.desde ?? null)} al {fecha(p?.hasta ?? null)}</p>
          <div className="text-xs pt-2">
            <p className="font-bold">{integrante === null ? "Integrantes" : "Presenta"}:</p>
            {autores.map((a) => <p key={a.id}>{a.nombre}{a.carnet ? ` (${a.carnet})` : ""}</p>)}
            {asesor && <p className="pt-2"><span className="font-bold">Docente asesor:</span> {asesor.nombre}</p>}
          </div>
        </section>

        {/* 2. Generalidades */}
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-xs tracking-wide">1. Generalidades de la institución</h2>
          <dl className="grid sm:grid-cols-[10rem_minmax(0,1fr)] gap-x-4 gap-y-1">
            <dt className="text-gray-500">Patrocinador</dt><dd>{det?.actorPatrocinador || "—"}</dd>
            <dt className="text-gray-500">Beneficiario</dt><dd>{det?.actorBeneficiario || "—"}</dd>
            <dt className="text-gray-500">Ejecutor</dt><dd>{det?.actorEjecutor || "—"}</dd>
            <dt className="text-gray-500">Financista</dt><dd>{det?.actorFinancista || "—"}</dd>
          </dl>
        </section>

        {/* 3. Cronograma y presupuesto del período */}
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-xs tracking-wide">2. Cronograma y presupuesto de actividades del período</h2>
          <p className="text-xs text-gray-500">Los valores solo se incluyen en las actividades ejecutadas en el período. Cada nivel suma los de sus hijos.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-300">
              <thead className="bg-gray-100">
                <tr><th className="text-left px-2 py-1 border-b border-gray-300 w-20">ID</th><th className="text-left px-2 py-1 border-b border-gray-300">Descripción de la actividad</th>
                  {inf.columnas.map((c) => <th key={c} className="text-right px-2 py-1 border-b border-gray-300 w-16">{c}</th>)}<th className="text-right px-2 py-1 border-b border-gray-300 w-20">Total</th></tr>
              </thead>
              <tbody>
                {inf.filas.map((f) => (
                  <tr key={f.id} className={f.nivel <= 2 ? "font-bold" : ""}>
                    <td className="px-2 py-0.5 font-mono">{f.codigo}</td>
                    <td className="px-2 py-0.5" style={sangria(f.nivel)}>{f.titulo}</td>
                    {f.montos.map((m, i) => <td key={i} className="px-2 py-0.5 text-right tabular-nums">{dinero(m)}</td>)}
                    <td className="px-2 py-0.5 text-right tabular-nums font-bold">{dinero(f.total)}</td>
                  </tr>
                ))}
                {inf.filas.length === 0 && <tr><td colSpan={inf.columnas.length + 3} className="px-2 py-2 text-gray-500">Sin actividades planificadas en el período.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Informe de avances */}
        <section className="space-y-3">
          <h2 className="font-bold uppercase text-xs tracking-wide">3. Informe de avances de ejecución del período {fecha(p?.desde ?? null)} al {fecha(p?.hasta ?? null)}</h2>
          <p><strong>1. {sinPunto(plan.plan.arbol.titulo)}:</strong> nivel de avance de {inf.avanceProyecto}% del total del proyecto alcanzado en el período.</p>
          {inf.filas.filter((f) => f.nivel >= 2).map((f) => (
            <div key={f.id} style={sangria(f.nivel - 1)} className="space-y-1">
              <p>
                <strong>{f.codigo} {sinPunto(f.titulo)}</strong>
                {f.vieneDe !== null && <span className="text-gray-600"> (continúa del período {f.vieneDe})</span>}
                {f.nivel < 4 ? `: nivel de avance de ${f.avance}%.` : f.registro ? `: ejecutada al ${f.registro.avance ?? 0}%${integrante === null ? ` (a cargo de ${nombre(f.responsable)})` : ""}.` : ": sin registro en el período."}
              </p>
              {f.registro && (
                <>
                  <p className="whitespace-pre-wrap text-gray-700">{f.registro.acciones}</p>
                  {f.registro.marcoTeorico && <p className="whitespace-pre-wrap text-gray-600 italic">{f.registro.marcoTeorico}</p>}
                </>
              )}
            </div>
          ))}
        </section>

        {/* 5. Resultados obtenidos */}
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-xs tracking-wide">4. Resultados obtenidos en el período</h2>
          <table className="w-full text-xs border border-gray-300">
            <thead className="bg-gray-100"><tr><th className="text-left px-2 py-1 w-20">ID</th><th className="text-left px-2 py-1">Nivel</th><th className="text-left px-2 py-1 w-32">Estado</th><th className="text-right px-2 py-1 w-24">Concluido</th><th className="text-right px-2 py-1 w-24">Pendiente</th></tr></thead>
            <tbody>
              {inf.filas.map((f) => (
                <tr key={f.id} className="border-t border-gray-200">
                  <td className="px-2 py-0.5 font-mono">{f.codigo}</td><td className="px-2 py-0.5" style={sangria(f.nivel)}>{f.titulo}</td>
                  <td className="px-2 py-0.5">{f.estado}</td><td className="px-2 py-0.5 text-right">{f.avance}%</td><td className="px-2 py-0.5 text-right">{100 - f.avance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 6. Resultados por actividad y 7. Anexos */}
        <section className="space-y-2">
          <h2 className="font-bold uppercase text-xs tracking-wide">5. Resultados por actividad</h2>
          {actividades.length === 0 ? <p className="text-gray-500">Todavía no hay actividades registradas en el período.</p> : (
            <table className="w-full text-xs border border-gray-300">
              <tbody>
                {actividades.map((f) => {
                  const suyas = evidencias.get(f.id) ?? [];
                  return (
                    <tr key={f.id} className="border-t border-gray-200 align-top">
                      <td className="px-2 py-1 font-mono w-20">{f.codigo}</td><td className="px-2 py-1 w-56">{f.titulo}</td>
                      <td className="px-2 py-1 whitespace-pre-wrap">{f.registro?.resultado}</td>
                      <td className="px-2 py-1 w-40 text-right">
                        {suyas.length === 0 ? <span className="text-gray-400">Sin evidencias</span> : suyas.map((e) => <a key={e.id} href={`#evidencia-${e.id}`} className="block hover:underline">Ver {e.etiqueta}</a>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <h2 className="font-bold uppercase text-xs tracking-wide pt-4">6. Anexos de resultados</h2>
          {listaEvidencias.length === 0 ? (
            <p className="text-gray-500">No se adjuntaron evidencias en el período.</p>
          ) : (
            <div className="space-y-4">
              {listaEvidencias.map((e) => {
                const nota = e.tipo === "imagen" ? notaImagen(e.origen, e.fuente) : [];
                return (
                  <figure key={e.id} id={`evidencia-${e.id}`} className="space-y-1" style={{ pageBreakInside: "avoid" }}>
                    {e.tipo === "imagen" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.url} alt={e.leyenda} className="max-h-72 max-w-full mx-auto object-contain border border-gray-200" />
                    )}
                    <figcaption className={e.tipo === "imagen" ? "text-center text-xs" : "text-xs"}>
                      <strong>{e.etiqueta}.</strong> {leyendaDocumento(e.leyenda)} (actividad {e.codigo}).
                      {e.tipo === "documento" && <span className="text-gray-600"> Documento adjunto: {e.nombre ?? "PDF"}.</span>}
                      {e.tipo === "enlace" && <> Disponible en: <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline break-all">{e.url}</a></>}
                      {nota.length > 0 && (
                        <span className="block text-gray-600">{nota.map((s, k) => (s.cursiva ? <em key={k}>{s.texto}</em> : <span key={k}>{s.texto}</span>))}</span>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}
