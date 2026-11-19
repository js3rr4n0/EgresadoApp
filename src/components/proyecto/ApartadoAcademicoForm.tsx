"use client";

// Apartado académico (redacción académica guiada, 13-nov-2026; specs/fichas/REDACCION_ACADEMICA.md). El egresado
// redacta por subapartados; al lado, el panel "Guía y revisión" muestra el propósito, las revisiones automáticas en vivo,
// la autoevaluación (que el asesor también ve), los errores frecuentes y un ejemplo. Solo los subapartados vacíos o bajo
// el mínimo impiden enviar; lo demás orienta.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarRespuestaApartado } from "@/app/actions/respuestasEspacios";
import {
  avanceApartado, guardarComoTexto, leerApartado, leerTabla, lineas, opcionesDeEspacio, palabras, parteVacia, revisarApartado, tipoApartado,
  type ContenidoApartado, type ContextoRevision, type OpcionesRevision, type ParteApartado, type Revision, type TipoApartado,
} from "@/lib/fichas/apartadosAcademicos";
import type { Espacio } from "@/lib/fichas/tipos";
import { ParrafosCitados, ReferenciasRegistro, useFuentes } from "./FuentesCitas";

interface Props {
  propuestaId: number;
  espacio: Espacio;
  etapa: "protocolo" | "informe_final";
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
  pasoSiguiente: number;
  pasoAnterior: number | null;
  hrefPaso: (n: number) => string;
  aviso?: string;
  contexto?: ContextoRevision;
}

const ESTILO_NIVEL: Record<Revision["nivel"], { icono: string; clase: string }> = {
  falta: { icono: "✕", clase: "text-red-700 bg-red-50 border-red-200" },
  aviso: { icono: "!", clase: "text-amber-800 bg-amber-50 border-amber-200" },
  ok: { icono: "✓", clase: "text-emerald-800 bg-emerald-50 border-emerald-200" },
};

const campo = "w-full p-3 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm leading-relaxed disabled:opacity-75";

function Aviso({ r }: { r: Revision }) {
  const e = ESTILO_NIVEL[r.nivel];
  return (
    <li className={`flex items-start gap-2 border rounded-md px-2 py-1.5 text-xs ${e.clase}`}>
      <span aria-hidden className="font-bold w-3 shrink-0 text-center">{e.icono}</span>
      <span>{r.mensaje}</span>
    </li>
  );
}

export default function ApartadoAcademicoForm({
  propuestaId, espacio, etapa, initialData, isLocked, isReadOnly = false, pasoSiguiente, pasoAnterior, hrefPaso, aviso, contexto,
}: Props) {
  const router = useRouter();
  const tipo = tipoApartado(espacio);
  const [contenido, setContenido] = useState<ContenidoApartado>(() => (tipo ? leerApartado(tipo, initialData) : { partes: {}, autoevaluacion: [] }));
  const [pending, setPending] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cambios, setCambios] = useState(false);
  const disabled = isLocked || isReadOnly;
  const opciones = opcionesDeEspacio(espacio, etapa);
  const revisiones = useMemo(() => (tipo ? revisarApartado(tipo, contenido, opciones, contexto) : []), [tipo, contenido, opciones, contexto]);

  if (!tipo) return <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">El tipo de este apartado no existe en el catálogo.</div>;

  const avance = avanceApartado(tipo, contenido);
  const faltas = revisiones.filter((r) => r.nivel === "falta").length;

  const cambiar = (id: string, valor: string) => {
    setContenido((c) => ({ ...c, partes: { ...c.partes, [id]: valor } }));
    setCambios(true);
    setMensaje(null);
  };
  const marcar = (i: number) => {
    setContenido((c) => ({ ...c, autoevaluacion: c.autoevaluacion.includes(i) ? c.autoevaluacion.filter((x) => x !== i) : [...c.autoevaluacion, i] }));
    setCambios(true);
  };

  const guardar = async (avanzar: boolean) => {
    if (disabled) return;
    setPending(true);
    setMensaje(null);
    const res = await guardarRespuestaApartado(propuestaId, espacio.id, contenido);
    setPending(false);
    if (!res.success) return setMensaje({ tipo: "error", texto: res.error });
    setCambios(false);
    setMensaje({ tipo: "ok", texto: faltas ? `Borrador guardado. Quedan ${faltas} pendiente(s) para poder enviar.` : `${espacio.titulo} guardado.` });
    if (avanzar) router.push(hrefPaso(pasoSiguiente));
    router.refresh();
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
      <div className="bg-white border border-border rounded-xl p-5 lg:p-7 shadow-sm min-w-0">
        <div className="mb-5 border-b border-border pb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">{tipo.nombre}</p>
            <h2 className="text-xl font-bold text-card-dark">
              {espacio.titulo} {!espacio.obligatorio && <span className="text-xs font-medium text-muted">(opcional)</span>}
            </h2>
            {espacio.descripcion && <p className="text-sm text-muted mt-1">{espacio.descripcion}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted">Subapartados completos</p>
            <p className="text-lg font-bold text-card-dark">{avance.completas}/{avance.total}</p>
            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden" aria-hidden>
              <div className="h-full bg-emerald-500" style={{ width: `${avance.total ? (avance.completas / avance.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {aviso && <div className="mb-5 p-3 bg-blue-50 border border-blue-100 text-blue-900 rounded-lg text-sm">{aviso}</div>}
        {mensaje && (
          <div role="status" className={`mb-5 p-3 rounded-lg text-sm font-medium border ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>{mensaje.texto}</div>
        )}

        <PartesApartado tipo={tipo} contenido={contenido} revisiones={revisiones} disabled={disabled} onCambiar={cambiar} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
          {pasoAnterior !== null ? (
            <button type="button" onClick={() => router.push(hrefPaso(pasoAnterior))} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark whitespace-nowrap cursor-pointer">
              ← Volver al paso anterior
            </button>
          ) : <span />}
          {!disabled && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {cambios && <span className="text-xs text-amber-700 whitespace-nowrap">Cambios sin guardar</span>}
              <button type="button" disabled={pending} onClick={() => guardar(false)}
                className="px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm whitespace-nowrap disabled:opacity-50 cursor-pointer">
                Guardar borrador
              </button>
              <button type="button" disabled={pending} onClick={() => guardar(true)}
                className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm shadow-sm whitespace-nowrap disabled:opacity-50 cursor-pointer">
                {pending ? "Guardando…" : "Guardar y continuar"}
              </button>
            </div>
          )}
        </div>
      </div>

      <GuiaApartado tipo={tipo} contenido={contenido} revisiones={revisiones} opciones={opciones} disabled={disabled}
        mostrarAutoevaluacion={espacio.parametros.autoevaluacion !== false} onMarcar={marcar} />
    </div>
  );
}

/** Panel "Guía y revisión": propósito, revisión automática, autoevaluación, errores frecuentes, ejemplo y reglas. */
export function GuiaApartado({ tipo, contenido, revisiones, opciones, disabled, mostrarAutoevaluacion, onMarcar }: {
  tipo: TipoApartado; contenido: ContenidoApartado; revisiones: Revision[]; opciones: OpcionesRevision; disabled: boolean; mostrarAutoevaluacion: boolean; onMarcar: (i: number) => void;
}) {
  const generales = revisiones.filter((r) => !r.parte);
  const faltas = revisiones.filter((r) => r.nivel === "falta").length;
  const avisos = revisiones.filter((r) => r.nivel === "aviso").length;
  const marcar = onMarcar;
  return (
    <aside aria-label="Guía y revisión" className="bg-white border border-border rounded-xl p-4 shadow-xs space-y-4 xl:sticky xl:top-4">
    <div>
      <h3 className="text-sm font-bold text-card-dark">Guía y revisión</h3>
      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{tipo.proposito}</p>
    </div>

    <div>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-card-dark">Revisión automática</h4>
        <span className="text-[11px] text-muted">{faltas ? `${faltas} pendiente(s)` : "sin pendientes"}{avisos ? ` · ${avisos} aviso(s)` : ""}</span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {faltas > 0 && <Aviso r={{ id: "resumen", nivel: "falta", mensaje: `${faltas} subapartado(s) vacíos o bajo el mínimo: impiden enviar.` }} />}
        {generales.map((r) => <Aviso key={r.id} r={r} />)}
        {!faltas && !generales.length && <li className="text-xs text-muted">{avisos ? "Los avisos están junto a cada subapartado." : "Escribe para ver la revisión."}</li>}
      </ul>
      <p className="text-[10px] text-muted mt-1.5">Los avisos son orientativos: la revisión automática puede equivocarse. Tu asesor tiene la última palabra.</p>
    </div>

    {mostrarAutoevaluacion && (
      <fieldset>
        <legend className="text-xs font-bold text-card-dark">Autoevaluación</legend>
        <p className="text-[10px] text-muted">{disabled ? "Lo que el equipo marcó como cumplido." : "Marca lo que ya cumples; tu asesor ve estas marcas."}</p>
        <div className="mt-1.5 space-y-1">
          {tipo.autoevaluacion.map((a, i) => (
            <label key={i} className="flex items-start gap-2 text-xs text-gray-700">
              <input type="checkbox" className="mt-0.5 accent-brand-red" checked={contenido.autoevaluacion.includes(i)} disabled={disabled} onChange={() => marcar(i)} />
              <span>{a}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )}

    <details className="text-xs">
      <summary className="font-bold text-card-dark cursor-pointer">Errores frecuentes</summary>
      <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-gray-700">{tipo.errores.map((x) => <li key={x}>{x}</li>)}</ul>
    </details>
    <details className="text-xs">
      <summary className="font-bold text-card-dark cursor-pointer">Ejemplo</summary>
      <p className="mt-1.5 text-gray-700 italic leading-relaxed">{tipo.ejemplo}</p>
    </details>
    <details className="text-xs">
      <summary className="font-bold text-card-dark cursor-pointer">Reglas de redacción</summary>
      <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-gray-700">
        <li>Tercera persona{opciones.tiempo === "futuro" ? " y tiempo futuro (se aplicará, se analizará)" : opciones.tiempo === "pasado" ? " y tiempo pasado (se aplicó, se analizó)" : ""}.</li>
        <li>Oraciones breves: menos de 45 palabras.</li>
        <li>Citas en APA 7: (Apellido, 2020) o Apellido (2020); con tres o más autores, Apellido et al. (2020).</li>
        {opciones.citasMinimas > 0 && <li>Este apartado pide al menos {opciones.citasMinimas} citas.</li>}
      </ul>
    </details>
  </aside>
  );
}

/** Subapartados del apartado, cada uno con su campo, su contador y sus avisos. */
export function PartesApartado({ tipo, contenido, revisiones, disabled, onCambiar }: {
  tipo: TipoApartado; contenido: ContenidoApartado; revisiones: Revision[]; disabled: boolean; onCambiar: (parte: string, valor: string) => void;
}) {
  return (
    <ol className="space-y-6">
      {tipo.partes.map((p, i) => (
        <li key={p.id}>
          <Subapartado n={i + 1} parte={p} valor={contenido.partes[p.id] ?? ""} disabled={disabled} onChange={(v) => onCambiar(p.id, v)}
            revisiones={revisiones.filter((r) => r.parte === p.id)} />
        </li>
      ))}
    </ol>
  );
}

function Subapartado({ n, parte: p, valor, disabled, onChange, revisiones }: {
  n: number; parte: ParteApartado; valor: string; disabled: boolean; onChange: (v: string) => void; revisiones: Revision[];
}) {
  const id = `parte-${p.id}`;
  const vacia = parteVacia(p, valor);
  const cuenta = p.formato === "texto" || p.formato === "pregunta" ? palabras(valor) : 0;
  const bajo = !!p.min && cuenta > 0 && cuenta < p.min;
  const sobre = !!p.max && cuenta > p.max;
  const items = p.formato === "lista" || p.formato === "referencias" ? lineas(valor) : [];
  const visibles = revisiones.filter((r) => !r.id.startsWith("vacio-") && !r.id.startsWith("min-"));
  // Con el registro de fuentes (protocolo), las referencias se arman solas y la fundamentación va por párrafos citados.
  const registro = useFuentes();

  return (
    <div>
      <div className="flex items-start gap-2 mb-1">
        <span className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${vacia ? "bg-gray-100 text-gray-500" : revisiones.some((r) => r.nivel === "falta") ? "bg-amber-100 text-amber-800" : "bg-emerald-500 text-white"}`}>
          {vacia || revisiones.some((r) => r.nivel === "falta") ? n : "✓"}
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="block text-sm font-bold text-card-dark">
            {p.titulo} {p.opcional && <span className="text-xs font-medium text-muted">(opcional)</span>}
          </label>
          <p className="text-xs text-muted">{p.ayuda}</p>
        </div>
      </div>

      {p.formato === "texto" && <textarea id={id} rows={Math.min(14, Math.max(4, Math.ceil((p.min ?? 60) / 25)))} value={valor} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={campo} />}
      {p.formato === "pregunta" && <textarea id={id} rows={2} value={valor} disabled={disabled} placeholder="¿…?" onChange={(e) => onChange(e.target.value)} className={campo} />}
      {p.formato === "seleccion" && (
        <select id={id} value={valor} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={campo}>
          <option value="">Elige una opción…</option>
          {p.opciones?.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
      )}
      {p.formato === "citado" && <ParrafosCitados parte={p} valor={valor} onChange={onChange} disabled={disabled} />}
      {p.formato === "referencias" && registro && <ReferenciasRegistro parte={p} valor={valor} onChange={onChange} disabled={disabled} />}
      {(p.formato === "lista" || (p.formato === "referencias" && !registro)) && (
        <>
          <textarea id={id} rows={Math.max(4, Math.min(14, items.length + 2))} value={valor} disabled={disabled} onChange={(e) => onChange(e.target.value)}
            placeholder={p.formato === "referencias" ? "Apellido, A. A. (2020). Título del libro. Editorial." : "Uno por línea"} className={`${campo} ${p.formato === "referencias" ? "font-mono text-xs" : ""}`} />
          <div className="flex items-center justify-between text-xs text-muted mt-1">
            <span className={(p.minItems && items.length < p.minItems) || (p.maxItems && items.length > p.maxItems) ? "text-amber-700 font-bold" : ""}>
              {items.length} {p.formato === "referencias" ? "referencia(s)" : "elemento(s)"}{rangoItems(p)} · uno por línea
            </span>
            {p.formato === "referencias" && !disabled && items.length > 1 && (
              <button type="button" className="font-bold text-gray-600 hover:text-brand-red"
                onClick={() => onChange([...items].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })).join("\n"))}>
                Ordenar alfabéticamente
              </button>
            )}
          </div>
        </>
      )}
      {p.formato === "tabla" && <TablaParte parte={p} valor={valor} disabled={disabled} onChange={onChange} />}

      {(p.formato === "texto" || p.formato === "pregunta") && (
        <div className={`flex justify-between text-xs mt-1 ${bajo ? "text-red-600 font-bold" : sobre ? "text-amber-700 font-bold" : "text-muted"}`}>
          <span>{p.min && p.max ? `Entre ${p.min} y ${p.max} palabras` : p.min ? `Al menos ${p.min} palabras` : p.max ? `Hasta ${p.max} palabras` : ""}</span>
          <span>{cuenta} palabra{cuenta === 1 ? "" : "s"}</span>
        </div>
      )}
      {/* El vacío y el mínimo ya se ven en el número y en el contador; aquí van los demás avisos del subapartado. */}
      {visibles.length > 0 && <ul className="mt-1.5 space-y-1">{visibles.map((r) => <Aviso key={r.id} r={r} />)}</ul>}
    </div>
  );
}

/** Límite de elementos o filas del subapartado, para mostrarlo junto al contador ("de 3 a 5"). */
function rangoItems(p: ParteApartado) {
  if (p.minItems && p.maxItems) return ` (de ${p.minItems} a ${p.maxItems})`;
  if (p.minItems) return ` (al menos ${p.minItems})`;
  if (p.maxItems) return ` (hasta ${p.maxItems})`;
  return "";
}

function TablaParte({ parte: p, valor, disabled, onChange }: { parte: ParteApartado; valor: string; disabled: boolean; onChange: (v: string) => void }) {
  const columnas = p.columnas ?? ["Valor"];
  const filas = leerTabla(valor, columnas.length);
  const lista = filas.length ? filas : [columnas.map(() => "")];
  const conTexto = lista.filter((f) => f.some((x) => x.trim())).length;
  const guardar = (nuevas: string[][]) => onChange(JSON.stringify(nuevas));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-border rounded-lg">
        <thead className="bg-slate-50">
          <tr>{columnas.map((c) => <th key={c} scope="col" className="text-left font-bold text-card-dark px-2 py-1.5 border-b border-border">{c}</th>)}{!disabled && <th className="w-8 border-b border-border" />}</tr>
        </thead>
        <tbody>
          {lista.map((f, i) => (
            <tr key={i} className="align-top">
              {f.map((celda, j) => (
                <td key={j} className="p-1 border-b border-border min-w-36">
                  <textarea aria-label={`${columnas[j]}, fila ${i + 1}`} rows={2} value={celda} disabled={disabled}
                    onChange={(e) => guardar(lista.map((x, k) => (k === i ? x.map((y, m) => (m === j ? e.target.value : y)) : x)))}
                    className="w-full p-1.5 rounded border border-transparent hover:border-border focus:border-brand-red focus:outline-none text-xs bg-transparent" />
                </td>
              ))}
              {!disabled && (
                <td className="p-1 border-b border-border text-center">
                  <button type="button" aria-label={`Quitar fila ${i + 1}`} onClick={() => guardar(lista.filter((_, k) => k !== i))} className="text-gray-400 hover:text-red-700 font-bold">✕</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between mt-1.5 text-xs">
        {!disabled && (!p.maxItems || lista.length < p.maxItems)
          ? <button type="button" onClick={() => guardar([...lista, columnas.map(() => "")])} className="font-bold text-gray-600 hover:text-brand-red">+ Agregar fila</button>
          : <span />}
        <span className={`text-muted ${(p.maxItems && conTexto > p.maxItems) || (p.minItems && conTexto < p.minItems) ? "text-amber-700 font-bold" : ""}`}>{conTexto} fila(s){rangoItems(p)}</span>
      </div>
    </div>
  );
}

/**
 * Capítulo del informe final que es un apartado académico (redacción guiada, 13-nov-2026). El contenido es el JSON
 * guardado en la versión del capítulo; el guardado, las versiones y el envío los maneja el editor del capítulo.
 */
export function CapituloApartado({ espacio, contenido, disabled, onChange, contexto }: {
  espacio: Espacio; contenido: string; disabled: boolean; onChange: (valor: string) => void; contexto?: ContextoRevision;
}) {
  const tipo = tipoApartado(espacio);
  const c = useMemo(() => (tipo ? leerApartado(tipo, contenido) : null), [tipo, contenido]);
  const opciones = opcionesDeEspacio(espacio, "informe_final");
  const revisiones = useMemo(() => (tipo && c ? revisarApartado(tipo, c, opciones, contexto) : []), [tipo, c, opciones, contexto]);
  if (!tipo || !c) return <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">El tipo de este apartado no existe en el catálogo.</div>;
  const avance = avanceApartado(tipo, c);
  const cambiar = (nuevo: ContenidoApartado) => onChange(guardarComoTexto(nuevo));
  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span className="font-bold uppercase tracking-wide text-brand-red">{tipo.nombre}</span>
          <span>Subapartados completos: <strong className="text-card-dark">{avance.completas}/{avance.total}</strong></span>
        </div>
        <PartesApartado tipo={tipo} contenido={c} revisiones={revisiones} disabled={disabled}
          onCambiar={(parte, valor) => cambiar({ ...c, partes: { ...c.partes, [parte]: valor } })} />
      </div>
      <GuiaApartado tipo={tipo} contenido={c} revisiones={revisiones} opciones={opciones} disabled={disabled}
        mostrarAutoevaluacion={espacio.parametros.autoevaluacion !== false}
        onMarcar={(i) => cambiar({ ...c, autoevaluacion: c.autoevaluacion.includes(i) ? c.autoevaluacion.filter((x) => x !== i) : [...c.autoevaluacion, i] })} />
    </div>
  );
}
