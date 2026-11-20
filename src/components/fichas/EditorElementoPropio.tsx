"use client";

// Editor de un elemento propio del catálogo (catálogo editable, entrega C1). El administrador define el nombre, la
// sección, las etapas y los campos con sus límites; ve una vista previa de cómo lo llenará el egresado, y lo publica
// cuando no tiene pendientes. Las fichas que ya lo usen guardan su copia (C2): editarlo no las cambia.
import { useMemo, useState, useTransition } from "react";
import {
  despublicarElementoPropio, eliminarElementoPropio, guardarElementoPropio, publicarElementoPropio, type ElementoPropio,
} from "@/app/actions/elementosCatalogo";
import { GRUPOS_CATALOGO, type GrupoCatalogo } from "@/lib/fichas/catalogo";
import {
  cambiarTipo, campoNuevo, ETAPAS_ELEMENTO, MAX_CAMPOS, problemasElementoPropio, reglasCampo, tipoCampo, TIPOS_CAMPO,
  type CampoPropio, type DefinicionElementoPropio, type TipoCampo,
} from "@/lib/fichas/elementosPropios";
import { campoCompacto, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";
import { nuevoId } from "./ids";

const numero = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));
const boton = "px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50";

export default function EditorElementoPropio({ elemento, onCambio, onEliminado }: {
  elemento: ElementoPropio;
  onCambio: (e: ElementoPropio) => void;
  onEliminado: (id: number) => void;
}) {
  const [def, setDef] = useState<DefinicionElementoPropio>(elemento.definicion);
  const [guardada, setGuardada] = useState(JSON.stringify(elemento.definicion));
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string; problemas?: string[] } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const sinGuardar = JSON.stringify(def) !== guardada;
  const problemas = useMemo(() => problemasElementoPropio(def), [def]);
  const publicado = elemento.estado === "publicado";

  const set = (cambios: Partial<DefinicionElementoPropio>) => setDef((d) => ({ ...d, ...cambios }));
  const ejecutar = (accion: () => Promise<{ success: true; elemento?: ElementoPropio } | { success: false; error: string; problemas?: string[] }>, ok: string) =>
    iniciar(async () => {
      const r = await accion();
      if (!r.success) {
        setMensaje({ tipo: "error", texto: r.error, problemas: r.problemas });
        return;
      }
      if (r.elemento) {
        onCambio(r.elemento);
        // La base (jsonb) devuelve las claves en otro orden: se toma su copia para comparar contra la misma forma.
        setDef(r.elemento.definicion);
        setGuardada(JSON.stringify(r.elemento.definicion));
      }
      setMensaje({ tipo: "ok", texto: ok });
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Elemento propio · {def.grupo}</div>
          <h2 className="text-lg font-bold text-gray-800 break-words">{def.nombre.trim() || "Elemento sin nombre"}</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
            <span className={`rounded-md px-2 py-0.5 font-bold ${publicado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
              {publicado ? "Publicado: se puede agregar a las fichas" : "Borrador: todavía no se ofrece en las fichas"}
            </span>
            {sinGuardar && <span className="rounded-md px-2 py-0.5 font-bold bg-blue-50 text-blue-700">Cambios sin guardar</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pendiente || !sinGuardar} onClick={() => ejecutar(() => guardarElementoPropio(elemento.id, def), "Cambios guardados.")}
            className={`${boton} bg-brand-red text-white hover:bg-red-800`}>Guardar cambios</button>
          {!publicado && (
            <button type="button" disabled={pendiente || sinGuardar || problemas.length > 0} title={sinGuardar ? "Guarda primero los cambios" : problemas.length ? "Resuelve los pendientes" : undefined}
              onClick={() => ejecutar(() => publicarElementoPropio(elemento.id), "Elemento publicado: ya se puede agregar a las fichas.")}
              className={`${boton} bg-emerald-600 text-white hover:bg-emerald-700`}>Publicar</button>
          )}
          {publicado && (
            <button type="button" disabled={pendiente} onClick={() => ejecutar(() => despublicarElementoPropio(elemento.id), "El elemento volvió a borrador.")}
              className={`${boton} border border-gray-300 text-gray-700 hover:bg-gray-50`}>Volver a borrador</button>
          )}
          {!publicado && (
            <button type="button" disabled={pendiente}
              onClick={() => { if (window.confirm(`¿Eliminar el elemento «${def.nombre}»? Las fichas que ya lo usen conservan su copia.`)) iniciar(async () => {
                const r = await eliminarElementoPropio(elemento.id);
                if (r.success) onEliminado(elemento.id); else setMensaje({ tipo: "error", texto: r.error });
              }); }}
              className={`${boton} border border-red-200 text-red-700 hover:bg-red-50`}>Eliminar</button>
          )}
        </div>
      </div>

      {mensaje && (
        <div role="status" className={`text-sm rounded-lg px-3 py-2 border ${mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          {mensaje.texto}
          {mensaje.problemas && <ul className="list-disc pl-5 mt-1">{mensaje.problemas.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      <Tarjeta titulo="Datos del elemento">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="ep-nombre" className={etiquetaCompacta}>Nombre</label>
            <input id="ep-nombre" className={campoCompacto} maxLength={150} value={def.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ep-desc" className={etiquetaCompacta}>Descripción</label>
            <textarea id="ep-desc" rows={2} className={`${campoCompacto} h-auto py-2`} value={def.descripcion}
              placeholder="Para qué sirve; se muestra en el catálogo y en el constructor" onChange={(e) => set({ descripcion: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ep-grupo" className={etiquetaCompacta}>Sección del catálogo</label>
            <select id="ep-grupo" className={campoCompacto} value={def.grupo} onChange={(e) => set({ grupo: e.target.value as GrupoCatalogo })}>
              {GRUPOS_CATALOGO.map((g) => <option key={g.grupo} value={g.grupo}>{g.grupo}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ep-alcance" className={etiquetaCompacta}>Respuestas</label>
            <select id="ep-alcance" className={campoCompacto} value={def.alcance} onChange={(e) => set({ alcance: e.target.value as "equipo" | "integrante" })}>
              <option value="equipo">Una por trabajo</option>
              <option value="integrante">Una por integrante</option>
            </select>
          </div>
          <fieldset>
            <legend className={etiquetaCompacta}>Etapas donde se puede usar</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {ETAPAS_ELEMENTO.map((e) => (
                <label key={e.valor} className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={def.etapas.includes(e.valor)}
                    onChange={(ev) => set({ etapas: ev.target.checked ? ETAPAS_ELEMENTO.map((x) => x.valor).filter((v) => v === e.valor || def.etapas.includes(v)) : def.etapas.filter((v) => v !== e.valor) })} />
                  {e.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Interruptor etiqueta="Se puede agregar más de una vez en la misma etapa" activo={def.repetible} onChange={(v) => set({ repetible: v })} />
            Se puede agregar más de una vez en la misma etapa
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo={`Campos que llena el egresado (${def.campos.length})`}>
        <EditorCampos campos={def.campos} onChange={(campos) => set({ campos })} />
      </Tarjeta>

      {problemas.length > 0 ? (
        <div className="text-sm rounded-lg px-3 py-2 border bg-amber-50 border-amber-200 text-amber-900">
          <strong>Antes de publicar:</strong>
          <ul className="list-disc pl-5 mt-1">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      ) : !publicado && (
        <p className="text-sm rounded-lg px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-800">Sin pendientes: {sinGuardar ? "guarda los cambios y publícalo" : "ya se puede publicar"}.</p>
      )}

      <Tarjeta titulo="Vista previa: así lo llenará el egresado">
        <VistaPreviaElemento def={def} />
      </Tarjeta>
    </div>
  );
}

/** Lista de campos con su tipo, etiqueta, ayuda, si es obligatorio y sus límites (elementos propios y campos adicionales, C4). */
export function EditorCampos({ campos, onChange, prefijo = "ep" }: { campos: CampoPropio[]; onChange: (campos: CampoPropio[]) => void; prefijo?: string }) {
  const [nuevoTipo, setNuevoTipo] = useState<TipoCampo>("texto");
  const setCampo = (id: string, cambios: Partial<CampoPropio>) => onChange(campos.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  const mover = (i: number, paso: -1 | 1) => {
    const j = i + paso;
    if (j < 0 || j >= campos.length) return;
    const lista = [...campos];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    onChange(lista);
  };
  return (
    <>
        <ol className="space-y-3">
          {campos.map((c, i) => (
            <li key={c.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 pb-2">{i + 1}.</span>
                <div className="flex-1 min-w-[12rem]">
                  <label htmlFor={`${prefijo}-et-${c.id}`} className={etiquetaCompacta}>Etiqueta</label>
                  <input id={`${prefijo}-et-${c.id}`} className={campoCompacto} value={c.etiqueta} placeholder="Lo que verá el egresado"
                    onChange={(e) => setCampo(c.id, { etiqueta: e.target.value })} />
                </div>
                <div className="w-40">
                  <label htmlFor={`${prefijo}-tipo-${c.id}`} className={etiquetaCompacta}>Tipo</label>
                  <select id={`${prefijo}-tipo-${c.id}`} className={campoCompacto} value={c.tipo}
                    onChange={(e) => onChange(campos.map((x) => (x.id === c.id ? cambiarTipo(x, e.target.value as TipoCampo) : x)))}>
                    {TIPOS_CAMPO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                  </select>
                </div>
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 pb-2">
                  <Interruptor etiqueta={`Campo ${i + 1} obligatorio`} activo={c.obligatorio} onChange={(v) => setCampo(c.id, { obligatorio: v })} />
                  Obligatorio
                </label>
                <div className="flex gap-1 pb-1 ml-auto">
                  <button type="button" aria-label={`Subir el campo ${i + 1}`} disabled={i === 0} onClick={() => mover(i, -1)} className="w-8 h-8 rounded border border-gray-200 text-gray-600 disabled:opacity-30">↑</button>
                  <button type="button" aria-label={`Bajar el campo ${i + 1}`} disabled={i === campos.length - 1} onClick={() => mover(i, 1)} className="w-8 h-8 rounded border border-gray-200 text-gray-600 disabled:opacity-30">↓</button>
                  <button type="button" aria-label={`Quitar el campo ${i + 1}`} onClick={() => onChange(campos.filter((x) => x.id !== c.id))} className="w-8 h-8 rounded border border-red-200 text-red-600">✕</button>
                </div>
              </div>
              <div>
                <label htmlFor={`${prefijo}-ay-${c.id}`} className={etiquetaCompacta}>Ayuda (opcional)</label>
                <input id={`${prefijo}-ay-${c.id}`} className={campoCompacto} value={c.ayuda} placeholder="Una indicación breve debajo del campo"
                  onChange={(e) => setCampo(c.id, { ayuda: e.target.value })} />
              </div>
              <Limites campo={c} onChange={(cambios) => setCampo(c.id, cambios)} />
              <p className="text-[11px] text-gray-500">{tipoCampo(c.tipo).descripcion} {reglasCampo(c)}.</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-end gap-2 mt-3">
          <div className="w-48">
            <label htmlFor={`${prefijo}-nuevo-tipo`} className={etiquetaCompacta}>Tipo del campo nuevo</label>
            <select id={`${prefijo}-nuevo-tipo`} className={campoCompacto} value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value as TipoCampo)}>
              {TIPOS_CAMPO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
            </select>
          </div>
          <button type="button" disabled={campos.length >= MAX_CAMPOS} onClick={() => onChange([...campos, campoNuevo(nuevoTipo, nuevoId("campo"))])}
            className="h-9 px-3 rounded-lg text-sm font-bold border border-dashed border-gray-400 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            + Agregar campo
          </button>
        </div>
    </>
  );
}

/** Los límites que admite el tipo del campo. Vacío = sin límite. */
function Limites({ campo: c, onChange }: { campo: CampoPropio; onChange: (cambios: Partial<CampoPropio>) => void }) {
  const lim = tipoCampo(c.tipo).limites;
  const caja = (id: string, etiqueta: string, valor: number | undefined, cambiar: (n: number | undefined) => void) => (
    <div className="w-28">
      <label htmlFor={id} className={etiquetaCompacta}>{etiqueta}</label>
      <input id={id} type="number" min={0} className={campoCompacto} value={valor ?? ""} onChange={(e) => cambiar(numero(e.target.value))} />
    </div>
  );
  if (lim.length === 0) return null;
  const cantidad = c.tipo === "imagen" ? "imágenes" : c.tipo === "archivo" ? "archivos" : c.tipo === "enlace" ? "enlaces" : "elementos";
  return (
    <div className="flex flex-wrap gap-3">
      {lim.includes("palabras") && c.tipo !== "lista" && <>
        {caja(`ep-minp-${c.id}`, "Mín. palabras", c.minPalabras, (n) => onChange({ minPalabras: n }))}
        {caja(`ep-maxp-${c.id}`, "Máx. palabras", c.maxPalabras, (n) => onChange({ maxPalabras: n }))}
      </>}
      {lim.includes("valor") && <>
        {caja(`ep-minv-${c.id}`, "Valor mínimo", c.minimo, (n) => onChange({ minimo: n }))}
        {caja(`ep-maxv-${c.id}`, "Valor máximo", c.maximo, (n) => onChange({ maximo: n }))}
      </>}
      {lim.includes("cantidad") && <>
        {caja(`ep-minc-${c.id}`, `Mín. ${cantidad}`, c.minimo, (n) => onChange({ minimo: n }))}
        {caja(`ep-maxc-${c.id}`, `Máx. ${cantidad}`, c.maximo, (n) => onChange({ maximo: n }))}
      </>}
      {c.tipo === "lista" && caja(`ep-maxpe-${c.id}`, "Palabras c/u", c.maxPalabras, (n) => onChange({ maxPalabras: n }))}
      {lim.includes("tamano") && caja(`ep-mb-${c.id}`, "MB por archivo", c.maxMB, (n) => onChange({ maxMB: n }))}
      {lim.includes("opciones") && (
        <div className="w-full space-y-1.5">
          <span className={etiquetaCompacta}>Opciones</span>
          {(c.opciones ?? []).map((o, k) => (
            <div key={k} className="flex gap-1.5">
              <input aria-label={`Opción ${k + 1}`} className={campoCompacto} value={o}
                onChange={(e) => onChange({ opciones: (c.opciones ?? []).map((x, j) => (j === k ? e.target.value : x)) })} />
              <button type="button" aria-label={`Quitar la opción ${k + 1}`} onClick={() => onChange({ opciones: (c.opciones ?? []).filter((_, j) => j !== k) })}
                className="w-9 h-9 shrink-0 rounded border border-gray-200 text-gray-500">✕</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => onChange({ opciones: [...(c.opciones ?? []), ""] })} className="text-xs font-bold text-brand-red hover:underline">+ Opción</button>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={!!c.multiple} onChange={(e) => onChange({ multiple: e.target.checked })} />
              Se puede marcar más de una
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/** Cómo verá el egresado el formulario (sin guardar nada). El formulario real es components/proyecto/CamposPropios.tsx. */
export function VistaPreviaElemento({ def }: { def: DefinicionElementoPropio }) {
  const campo = "w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-400";
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-800">{def.nombre.trim() || "Elemento sin nombre"}</h3>
        {def.descripcion.trim() && <p className="text-sm text-gray-500">{def.descripcion}</p>}
      </div>
      {def.campos.map((c) => (
        <div key={c.id}>
          <div className="text-sm font-bold text-gray-800">{c.etiqueta.trim() || "(sin etiqueta)"}{c.obligatorio ? " *" : ""}</div>
          {c.ayuda.trim() && <p className="text-xs text-gray-500 mb-1">{c.ayuda}</p>}
          {c.tipo === "texto_largo" ? <div className={`${campo} h-20`}>Párrafos…</div>
            : c.tipo === "seleccion" ? (
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                {(c.opciones ?? []).filter((o) => o.trim()).map((o) => (
                  <label key={o} className="inline-flex items-center gap-1.5"><input type={c.multiple ? "checkbox" : "radio"} disabled /> {o}</label>
                ))}
              </div>
            ) : c.tipo === "archivo" || c.tipo === "imagen" ? <div className={`${campo} border-dashed`}>{c.tipo === "imagen" ? "Subir imagen" : "Subir archivo"}</div>
            : c.tipo === "lista" ? <div className={`${campo} h-16`}>Un elemento por línea…</div>
            : <div className={campo}>{c.tipo === "fecha" ? "dd/mm/aaaa" : c.tipo === "numero" ? "0" : c.tipo === "enlace" ? "https://…" : "Texto…"}</div>}
          <p className="text-[11px] text-gray-400 mt-0.5">{reglasCampo(c)}</p>
        </div>
      ))}
      {def.campos.length === 0 && <p className="text-sm text-gray-500">Agrega al menos un campo.</p>}
    </div>
  );
}
