"use client";

// Fuentes y citas del protocolo (ajustes al protocolo, 19-nov-2026). El registro de fuentes del trabajo (campos APA 7
// de pasantía) se comparte por contexto; la fundamentación se escribe por párrafos, cada uno con sus fuentes, y el
// sistema agrega la cita (Apellido, año). Las referencias se arman solas con el registro y llevan un contador.
import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CitaApaCampos from "@/app/egresado/reportes/actividad/[actividadId]/CitaApaCampos";
import { datosCitaVacios, segmentosCitaApa, type DatosCitaApa } from "@/lib/citaApa";
import { citaDeFuentes, citaEnTexto, guardarParrafos, leerParrafos, parrafoConCita, referenciasOrdenadas, type Fuente, type ParrafoCitado } from "@/lib/fichas/fuentes";
import { lineas, palabras, type ParteApartado } from "@/lib/fichas/apartadosAcademicos";
import { eliminarFuente, guardarFuente } from "@/app/actions/fuentesTrabajo";

export interface RegistroFuentes {
  propuestaId: number;
  fuentes: Fuente[];
  /** Ids de las fuentes citadas en algún párrafo del documento. */
  citadas: number[];
  /** Quien redacta puede agregar, corregir y quitar fuentes. */
  editable: boolean;
}

const ContextoFuentes = createContext<RegistroFuentes | null>(null);
export const ProveedorFuentes = ContextoFuentes.Provider;
export const useFuentes = () => useContext(ContextoFuentes);

const campo = "w-full p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red disabled:bg-gray-50 disabled:text-gray-600";

/** Formulario de una fuente con los campos APA 7. Al guardar, el servidor la valida y la agrega al registro. */
function FuenteFormulario({ propuestaId, fuente, onListo, onCancelar }: { propuestaId: number; fuente?: Fuente; onListo: (f: Fuente) => void; onCancelar: () => void }) {
  const [datos, setDatos] = useState<DatosCitaApa>(fuente?.datos ?? datosCitaVacios());
  const [error, setError] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  async function guardar() {
    setOcupado(true);
    setError(null);
    setProblemas([]);
    const res = await guardarFuente(propuestaId, fuente?.id ?? null, datos);
    setOcupado(false);
    if (!res.success) {
      setError(res.error);
      setProblemas(res.problemas ?? []);
      return;
    }
    onListo(res.fuente);
  }
  return (
    <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2">
      <p className="text-xs font-bold text-card-dark">{fuente ? "Corregir la fuente" : "Nueva fuente"}</p>
      <CitaApaCampos datos={datos} onChange={setDatos} />
      {error && (
        <div className="text-xs text-red-700 font-semibold">
          {error}
          {problemas.length > 0 && <ul className="list-disc pl-5 font-medium">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="px-3 py-1.5 rounded-md text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
        <button type="button" disabled={ocupado} onClick={guardar} className="px-3 py-1.5 rounded-md text-xs font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">
          {ocupado ? "Guardando…" : fuente ? "Guardar cambios" : "Agregar fuente"}
        </button>
      </div>
    </div>
  );
}

/** Referencia APA 7 con sus cursivas. */
function Referencia({ datos }: { datos: DatosCitaApa }) {
  return <>{segmentosCitaApa(datos).map((s, i) => (s.cursiva ? <em key={i}>{s.texto}</em> : <span key={i}>{s.texto}</span>))}</>;
}

/**
 * Párrafos citados: cada párrafo con su texto y sus fuentes; la cita (Apellido, año) se agrega sola al final.
 * Se guarda como JSON; el servidor recalcula la cita con el registro.
 */
export function ParrafosCitados({ parte: p, valor, onChange, disabled, placeholder }: { parte: ParteApartado; valor: string; onChange: (v: string) => void; disabled: boolean; placeholder?: string }) {
  const router = useRouter();
  const registro = useFuentes();
  const [nuevas, setNuevas] = useState<Fuente[]>([]);
  const [creandoEn, setCreandoEn] = useState<number | null>(null);
  const fuentes = useMemo(() => [...(registro?.fuentes ?? []), ...nuevas.filter((n) => !registro?.fuentes.some((f) => f.id === n.id))], [registro, nuevas]);
  const mapa = useMemo(() => new Map(fuentes.map((f) => [f.id, f.datos])), [fuentes]);
  const leidos = leerParrafos(valor);
  const parrafos: ParrafoCitado[] = leidos.length ? leidos : [{ texto: "", fuentes: [] }];
  const total = palabras(parrafos.map((x) => x.texto).join(" "));
  const editable = !disabled;

  const guardar = (ps: ParrafoCitado[]) => onChange(guardarParrafos(ps.map((x) => ({ ...x, cita: citaDeFuentes(x.fuentes, mapa) || undefined }))));
  const cambiar = (i: number, cambios: Partial<ParrafoCitado>) => guardar(parrafos.map((x, k) => (k === i ? { ...x, ...cambios } : x)));
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= parrafos.length) return;
    const ps = [...parrafos];
    [ps[i], ps[j]] = [ps[j], ps[i]];
    guardar(ps);
  };

  return (
    <div className="space-y-3">
      {!registro && <p className="text-xs text-amber-700">El registro de fuentes no está disponible aquí.</p>}
      <ol className="space-y-3">
        {parrafos.map((x, i) => {
          const cita = citaDeFuentes(x.fuentes, mapa);
          const sinFuente = x.texto.trim() && x.fuentes.length === 0;
          return (
            <li key={i} className={`border rounded-lg p-3 space-y-2 ${sinFuente && p.citaPorParrafo !== false ? "border-amber-300 bg-amber-50/30" : "border-gray-200"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Párrafo {i + 1}</span>
                {editable && (
                  <span className="flex items-center gap-1 text-xs">
                    <button type="button" aria-label={`Subir el párrafo ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)} className="px-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30">↑</button>
                    <button type="button" aria-label={`Bajar el párrafo ${i + 1}`} disabled={i === parrafos.length - 1} onClick={() => mover(i, 1)} className="px-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30">↓</button>
                    {parrafos.length > 1 && <button type="button" onClick={() => guardar(parrafos.filter((_, k) => k !== i))} className="px-1.5 font-bold text-red-600 hover:underline">Quitar</button>}
                  </span>
                )}
              </div>
              <textarea aria-label={`${p.titulo}, párrafo ${i + 1}`} rows={4} value={x.texto} disabled={disabled} onChange={(e) => cambiar(i, { texto: e.target.value })}
                placeholder={placeholder ?? "Lo que plantean los autores sobre el tema, con sus palabras y su interpretación."} className={campo} />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-gray-600">Fuentes:</span>
                {x.fuentes.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-300 rounded-full pl-2 pr-1 py-0.5">
                    {mapa.has(id) ? citaEnTexto(mapa.get(id)!) : "Fuente quitada"}
                    {editable && <button type="button" aria-label="Quitar la fuente del párrafo" onClick={() => cambiar(i, { fuentes: x.fuentes.filter((y) => y !== id) })} className="text-gray-400 hover:text-red-600 px-1">✕</button>}
                  </span>
                ))}
                {x.fuentes.length === 0 && <span className="text-xs text-amber-800">ninguna todavía</span>}
                {editable && fuentes.some((f) => !x.fuentes.includes(f.id)) && (
                  <select aria-label={`Agregar una fuente al párrafo ${i + 1}`} value="" onChange={(e) => e.target.value && cambiar(i, { fuentes: [...x.fuentes, Number(e.target.value)] })}
                    className="text-xs border border-gray-300 rounded-md px-1.5 py-1 bg-white max-w-[16rem]">
                    <option value="">+ Elegir del registro…</option>
                    {fuentes.filter((f) => !x.fuentes.includes(f.id)).map((f) => <option key={f.id} value={f.id}>{citaEnTexto(f.datos)} · {f.datos.titulo.slice(0, 50)}</option>)}
                  </select>
                )}
                {editable && registro?.editable && creandoEn !== i && (
                  <button type="button" onClick={() => setCreandoEn(i)} className="text-xs font-bold text-brand-red hover:underline">+ Nueva fuente</button>
                )}
              </div>
              {creandoEn === i && registro && (
                <FuenteFormulario propuestaId={registro.propuestaId} onCancelar={() => setCreandoEn(null)}
                  onListo={(f) => { setNuevas((n) => [...n, f]); cambiar(i, { fuentes: [...x.fuentes, f.id] }); setCreandoEn(null); router.refresh(); }} />
              )}
              {x.texto.trim() && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-md px-2.5 py-1.5"><span className="font-bold text-gray-500">Así queda: </span>{parrafoConCita(x, cita)}</p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex items-center justify-between text-xs text-muted">
        {editable ? <button type="button" onClick={() => guardar([...parrafos, { texto: "", fuentes: [] }])} className="font-bold text-gray-600 hover:text-brand-red">+ Agregar párrafo</button> : <span />}
        <span>
          {parrafos.filter((x) => x.texto.trim()).length} párrafo(s) · {total} palabra(s)
          {p.min && p.max ? ` (entre ${p.min} y ${p.max})` : p.min ? ` (al menos ${p.min})` : ""}
        </span>
      </div>
    </div>
  );
}

/**
 * Referencias: las del registro (en orden alfabético, con la marca "citada" o "consultada") más, por compatibilidad, las
 * escritas a mano. Contador frente al mínimo de la ficha.
 */
export function ReferenciasRegistro({ parte: p, valor, onChange, disabled }: { parte: ParteApartado; valor: string; onChange: (v: string) => void; disabled: boolean }) {
  const router = useRouter();
  const registro = useFuentes()!;
  const [editando, setEditando] = useState<Fuente | "nueva" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manuales = lineas(valor);
  const ordenadas = referenciasOrdenadas(registro.fuentes);
  const total = ordenadas.length + manuales.length;
  const minimo = p.minItems ?? 0;
  const editable = !disabled && registro.editable;

  async function quitar(f: Fuente) {
    if (!window.confirm(`¿Quitar «${citaEnTexto(f.datos)}» del registro? Los párrafos que la citan quedarán sin ella.`)) return;
    const res = await eliminarFuente(registro.propuestaId, f.id);
    if (!res.success) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${minimo && total < minimo ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
        <span>{minimo ? `${total} de ${minimo} referencias` : `${total} referencia(s)`}</span>
        <span className="text-xs font-semibold">{minimo && total < minimo ? `Faltan ${minimo - total}` : "Va bien"}</span>
      </div>
      <p className="text-xs text-muted">
        Las fuentes que citó en la fundamentación (y en otros apartados) ya están aquí. Agregue también las que consultó y le sirven para el tema, aunque no las haya citado.
        Se ordenan solas, en APA 7.
      </p>
      {error && <p className="text-xs text-red-700 font-semibold">{error}</p>}
      {ordenadas.length > 0 && (
        <ol className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {ordenadas.map((f) => (
            <li key={f.id} className="px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-start gap-2">
              <span className="flex-1 min-w-0 pl-6 -indent-6"><Referencia datos={f.datos} /></span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${registro.citadas.includes(f.id) ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                  {registro.citadas.includes(f.id) ? "Citada" : "Consultada"}
                </span>
                {editable && <button type="button" onClick={() => setEditando(f)} className="text-xs font-bold text-gray-600 hover:text-brand-red">Corregir</button>}
                {editable && <button type="button" onClick={() => quitar(f)} className="text-xs font-bold text-red-600 hover:underline">Quitar</button>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {editando && (
        <FuenteFormulario propuestaId={registro.propuestaId} fuente={editando === "nueva" ? undefined : editando} onCancelar={() => setEditando(null)}
          onListo={() => { setEditando(null); router.refresh(); }} />
      )}
      {editable && !editando && (
        <button type="button" onClick={() => setEditando("nueva")} className="text-sm font-bold text-brand-red hover:underline">+ Agregar fuente consultada</button>
      )}
      {(manuales.length > 0 || !disabled) && (
        <details className="text-sm" open={manuales.length > 0}>
          <summary className="cursor-pointer text-xs font-bold text-gray-600">Referencias escritas a mano ({manuales.length})</summary>
          <p className="text-xs text-muted mt-1">Por compatibilidad: una referencia por línea, en APA 7. Es mejor registrarlas con los campos, para que se armen solas.</p>
          <textarea rows={Math.max(3, Math.min(10, manuales.length + 1))} value={valor} disabled={disabled} onChange={(e) => onChange(e.target.value)}
            aria-label="Referencias escritas a mano" className={`${campo} font-mono text-xs mt-1`} placeholder="Apellido, A. A. (2020). Título del libro. Editorial." />
        </details>
      )}
    </div>
  );
}
