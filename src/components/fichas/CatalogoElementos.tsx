"use client";

// Catálogo de elementos (revisión del 13-nov-2026): reúne todo lo que usan las fichas de pasantía, proyecto e
// investigación, ordenado por secciones. Cualquier elemento se puede usar en cualquier ficha; se indica en qué etapas
// funciona y en qué asistentes ya tiene formulario. Al final, las etapas y los momentos de control como referencia
// (no son espacios: se agregan desde su pestaña del constructor).
import { useState, useTransition } from "react";
import { crearElementoPropio, type ElementoPropio } from "@/app/actions/elementosCatalogo";
import EditorElementoPropio from "./EditorElementoPropio";
import { CATALOGO, ELEMENTOS_SISTEMA, elementoEnEtapa, GRUPOS_CATALOGO, type EtapaDeEspacios } from "@/lib/fichas/catalogo";
import { CAMPOS_ELEMENTO } from "@/lib/fichas/disenoFuturo";
import { TIPOS_APARTADO } from "@/lib/fichas/apartadosAcademicos";
import { TIPOS_HITO, type ClaveElemento, type Modalidad } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD } from "./comunes";

const MODALIDADES: Modalidad[] = ["pasantia", "proyecto", "investigacion"];
const ETAPAS: { clave: EtapaDeEspacios; nombre: string }[] = [
  { clave: "propuesta", nombre: "Propuesta" },
  { clave: "protocolo", nombre: "Protocolo" },
  { clave: "informe_final", nombre: "Informe final" },
];

/** Etapas y momentos de control de una ficha (referencia: se configuran en su pestaña del constructor). */
const ETAPAS_REFERENCIA: { id: string; nombre: string; pestana: string; usadoEn: Modalidad[]; descripcion: string; detalle: string[] }[] = [
  {
    id: "plan", nombre: "Plan de trabajo", pestana: "Plan de trabajo", usadoEn: ["proyecto", "investigacion"],
    descripcion: "Cronograma jerárquico después de la propuesta aprobada: objetivo general → objetivos específicos → macroactividades → actividades → subactividades.",
    detalle: ["Presupuesto opcional (proyecto sí, investigación no)", "Responsable por objetivo o por actividad, plan general e individual", "Documento solicitado por actividad (investigación)", "Lo aprueba el asesor"],
  },
  {
    id: "protocolo", nombre: "Protocolo", pestana: "Protocolo", usadoEn: ["investigacion"],
    descripcion: "Documento de investigación que se redacta con el plan de trabajo (su cronograma) y que dictamina el asesor.",
    detalle: ["Espacios del catálogo con precarga desde la propuesta", "Ratificación del equipo", "Dictamen escrito en días hábiles"],
  },
  {
    id: "ejecucion", nombre: "Ejecución", pestana: "Ejecución", usadoEn: ["pasantia", "proyecto", "investigacion"],
    descripcion: "Períodos y subperíodos a partir de la carta: registro de actividades, revisión del asesor e informes de cada período.",
    detalle: ["Registro por subperíodo (pasantía) o por actividad del plan, con avance y evidencias", "Marco teórico obligatorio, opcional o no se pide", "Informe único o individual y general", "Métrica de páginas, palabras e imágenes"],
  },
  {
    id: "informe_final", nombre: "Informe final por capítulos", pestana: "Informe final", usadoEn: ["investigacion"],
    descripcion: "Documento final redactado en el sistema por todo el equipo, con versiones, revisión por capítulo y entrega congelada.",
    detalle: ["Capítulos del catálogo con precarga del protocolo y de los registros", "Ratificación y huella de la versión entregada", "Exportación a PDF y Word"],
  },
];

type Seleccion = { tipo: "elemento"; clave: ClaveElemento } | { tipo: "propio"; id: number } | { tipo: "etapa"; id: string } | { tipo: "hitos" };

const chip = "rounded-md px-2 py-0.5 font-bold";

export default function CatalogoElementos({ propios: iniciales = [] }: { propios?: ElementoPropio[] }) {
  const [sel, setSel] = useState<Seleccion>({ tipo: "elemento", clave: "portada" });
  // Elementos propios (catálogo editable, entrega C1): los crea el administrador desde aquí.
  const [propios, setPropios] = useState<ElementoPropio[]>(iniciales);
  const [error, setError] = useState<string | null>(null);
  const [creando, iniciar] = useTransition();
  const nuevo = () =>
    iniciar(async () => {
      const r = await crearElementoPropio();
      if (!r.success) return setError(r.error);
      setError(null);
      setPropios((p) => [...p, r.elemento]);
      setSel({ tipo: "propio", id: r.elemento.id });
    });
  const propioSel = sel.tipo === "propio" ? propios.find((p) => p.id === sel.id) : undefined;
  const activo = (s: Seleccion) => JSON.stringify(s) === JSON.stringify(sel);
  const boton = (s: Seleccion, texto: string, nota?: string) => (
    <button type="button" onClick={() => setSel(s)} aria-current={activo(s)}
      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm ${activo(s) ? "bg-red-50 text-brand-red font-bold" : "text-gray-700 hover:bg-gray-50"}`}>
      {texto}
      {nota && <span className="block text-[10px] font-normal text-gray-400">{nota}</span>}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-3xl">
          Todos los elementos que usan las fichas de pasantía, proyecto e investigación. Cualquiera se puede agregar a cualquier ficha:
          cada uno indica en qué etapas funciona y en qué asistentes ya tiene formulario. Con «Nuevo elemento» se arma un elemento propio
          con los campos que hagan falta. Al final están las etapas y los momentos de control, que se agregan desde su pestaña.
        </p>
        <button type="button" onClick={nuevo} disabled={creando}
          className="px-3.5 py-2 rounded-lg text-sm font-bold bg-brand-red text-white hover:bg-red-800 disabled:opacity-50 shrink-0">
          {creando ? "Creando…" : "+ Nuevo elemento"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid md:grid-cols-[14rem_minmax(0,1fr)] gap-4">
        <nav className="bg-white border border-gray-200 rounded-xl p-2 space-y-3 self-start" aria-label="Catálogo">
          {GRUPOS_CATALOGO.map(({ grupo }, i) => (
            <div key={grupo}>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-2 mb-1">{i + 1}. {grupo}</div>
              {ELEMENTOS_SISTEMA.filter((x) => x.grupo === grupo).map((x) => <div key={x.clave}>{boton({ tipo: "elemento", clave: x.clave }, x.nombre)}</div>)}
              {propios.filter((p) => p.definicion.grupo === grupo).map((p) => (
                <div key={`p${p.id}`}>{boton({ tipo: "propio", id: p.id }, p.definicion.nombre.trim() || "Elemento sin nombre", p.estado === "publicado" ? "Propio · publicado" : "Propio · borrador")}</div>
              ))}
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-2 mb-1">Etapas y momentos (referencia)</div>
            {ETAPAS_REFERENCIA.map((e) => <div key={e.id}>{boton({ tipo: "etapa", id: e.id }, e.nombre, `Pestaña ${e.pestana}`)}</div>)}
            {boton({ tipo: "hitos" }, "Hitos y requisitos", "Pestaña Ejecución")}
          </div>
        </nav>

        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 min-w-0">
          {sel.tipo === "elemento" && <DetalleElemento clave={sel.clave} />}
          {sel.tipo === "propio" && propioSel && (
            <EditorElementoPropio key={propioSel.id} elemento={propioSel}
              onCambio={(e) => setPropios((p) => p.map((x) => (x.id === e.id ? e : x)))}
              onEliminado={(id) => { setPropios((p) => p.filter((x) => x.id !== id)); setSel({ tipo: "elemento", clave: "portada" }); }} />
          )}
          {sel.tipo === "etapa" && <DetalleEtapa id={sel.id} />}
          {sel.tipo === "hitos" && <DetalleHitos />}
        </section>
      </div>
    </div>
  );
}

function DetalleElemento({ clave }: { clave: ClaveElemento }) {
  const el = CATALOGO[clave];
  const seccion = GRUPOS_CATALOGO.find((g) => g.grupo === el.grupo);
  return (
    <>
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{el.grupo} · {seccion?.descripcion}</div>
        <h2 className="text-lg font-bold text-gray-800">{el.nombre}</h2>
        <p className="text-sm text-gray-600 mt-1">{el.descripcion}</p>
        <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
          <span className={`${chip} bg-blue-50 text-blue-700`}>{el.alcance === "integrante" ? "Una respuesta por integrante" : "Una respuesta por trabajo"}</span>
          {el.repetible && <span className={`${chip} bg-purple-50 text-purple-700`}>Se puede repetir</span>}
          {el.requiere.map((r) => <span key={r} className={`${chip} bg-amber-50 text-amber-800`}>Va después de {CATALOGO[r].nombre}</span>)}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-lg p-3">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Etapas en las que se usa</h3>
          <ul className="space-y-1 text-sm">
            {ETAPAS.map((e) => (
              <li key={e.clave} className={elementoEnEtapa(clave, e.clave) ? "text-gray-800" : "text-gray-300 line-through"}>
                {elementoEnEtapa(clave, e.clave) ? "✓" : "✕"} {e.nombre}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-gray-100 rounded-lg p-3">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Formulario en el asistente</h3>
          <ul className="space-y-1 text-sm">
            {MODALIDADES.map((m) => (
              <li key={m} className={el.formularioEn.includes(m) ? "text-gray-800" : "text-amber-700"}>
                {el.formularioEn.includes(m) ? "✓" : "◷"} {ETIQUETA_MODALIDAD[m]}{el.formularioEn.includes(m) ? "" : ": se puede agregar; formulario pendiente"}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-500 mt-2">El asistente de pasantía todavía es el de la fase 1: muestra sus 7 pasos fijos.</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Campos que llena el egresado</h3>
          <span className="text-[11px] text-gray-500">Campos del sistema: fijos. En cada ficha se pueden agregar campos al final del paso.</span>
        </div>
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {CAMPOS_ELEMENTO[el.clave].map((c) => (
            <li key={c.nombre} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="text-gray-300" aria-hidden="true">⋮⋮</span>
              <span className="flex-1 min-w-0 text-gray-800">{c.nombre}</span>
              <span className="hidden sm:inline text-xs text-gray-500 w-20 shrink-0">{c.tipo}</span>
              <span className={`shrink-0 text-xs font-bold w-20 text-right ${c.obligatorio ? "text-gray-700" : "text-gray-400"}`}>{c.obligatorio ? "Obligatorio" : "Opcional"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Reglas que se configuran en cada ficha</h3>
        {el.parametros.length === 0 ? (
          <p className="text-sm text-gray-500">Este elemento no tiene reglas configurables.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {el.parametros.map((p) => (
              <li key={p.clave} className="border border-gray-100 rounded-lg px-3 py-2 text-sm">
                <div className="text-gray-800">{p.etiqueta}</div>
                <div className="text-xs text-gray-500">
                  Valor por defecto:{" "}
                  {p.tipo === "numero" ? `${p.porDefecto}${p.sufijo ? ` ${p.sufijo}` : ""} (de ${p.min} a ${p.max})` : p.tipo === "booleano" ? (p.porDefecto ? "sí" : "no") : p.tipo === "textos" ? p.porDefecto.join(" · ") : p.tipo === "opcion" ? (p.opciones.find((o) => o.valor === p.porDefecto)?.etiqueta ?? p.porDefecto) : p.porDefecto.map((v) => p.opciones.find((o) => o.valor === v)?.etiqueta).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {clave === "apartado" && <TiposApartado />}
    </>
  );
}

const ETAPA_TIPO = { protocolo: "Protocolo", informe: "Informe final", ambas: "Protocolo e informe final" } as const;
const REVISION_ESPECIAL = {
  pregunta: "pregunta entre ¿?",
  hipotesis: "Ho niega a Hi",
  objetivos: "verbos en infinitivo medibles, de 3 a 4 específicos por integrante (como la propuesta y el plan)",
  conclusiones: "una conclusión por objetivo",
  referencias: "forma APA 7, orden alfabético, duplicados y antigüedad",
  agradecimientos: "avisa agradecimientos personales o familiares y más de 4 párrafos",
  objetivos_finales: "si los objetivos cambiaron, pide la justificación",
} as const;

/** Tipos de apartado académico: subapartados, extensión y revisiones (guía de UNICAES, 2024). */
function TiposApartado() {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Tipos de apartado</h3>
      <p className="text-xs text-gray-500 mb-2">
        Todos revisan la extensión, las oraciones largas, la tercera persona, el tiempo verbal de la etapa y las citas APA (y su cruce con las
        referencias). Solo los subapartados vacíos o bajo el mínimo impiden enviar; lo demás son avisos.
      </p>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {Object.values(TIPOS_APARTADO).map((t) => (
          <li key={t.clave} className="px-3 py-2.5 text-sm">
            <details>
              <summary className="cursor-pointer flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-800">{t.nombre}</span>
                <span className={`${chip} text-[11px] ${t.etapa === "informe" ? "bg-emerald-50 text-emerald-700" : t.etapa === "protocolo" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>{ETAPA_TIPO[t.etapa]}</span>
                <span className="text-xs text-gray-500">{t.partes.length} subapartado(s){t.citasMinimas ? ` · ${t.citasMinimas} citas mínimas` : ""}</span>
              </summary>
              <p className="text-xs text-gray-600 mt-1.5">{t.proposito}</p>
              <ol className="mt-1.5 space-y-0.5 text-xs text-gray-700 list-decimal pl-5">
                {t.partes.map((p) => (
                  <li key={p.id}>
                    {p.titulo}
                    <span className="text-gray-400">
                      {p.min || p.max ? ` · ${p.min ? `${p.min}` : "0"}–${p.max || "∞"} palabras` : p.formato === "tabla" ? ` · tabla (${p.columnas?.join(", ")})` : p.formato === "seleccion" ? " · selección" : " · uno por línea"}
                      {p.opcional ? " · opcional" : ""}
                    </span>
                  </li>
                ))}
              </ol>
              {t.especiales.length > 0 && <p className="text-xs text-gray-500 mt-1">Revisa además: {t.especiales.map((x) => REVISION_ESPECIAL[x]).join("; ")}.</p>}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetalleEtapa({ id }: { id: string }) {
  const e = ETAPAS_REFERENCIA.find((x) => x.id === id)!;
  return (
    <>
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Etapa · se agrega desde la pestaña {e.pestana}</div>
        <h2 className="text-lg font-bold text-gray-800">{e.nombre}</h2>
        <p className="text-sm text-gray-600 mt-1">{e.descripcion}</p>
        <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
          {e.usadoEn.map((m) => <span key={m} className={`${chip} bg-gray-100 text-gray-700`}>Usada en {ETIQUETA_MODALIDAD[m]}</span>)}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Qué se configura</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">{e.detalle.map((d) => <li key={d}>{d}</li>)}</ul>
      </div>
    </>
  );
}

function DetalleHitos() {
  return (
    <>
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Momentos de control · se agregan en la pestaña Ejecución</div>
        <h2 className="text-lg font-bold text-gray-800">Hitos y requisitos</h2>
        <p className="text-sm text-gray-600 mt-1">Requisitos antes de iniciar la ejecución y momentos de control durante ella. Se usan en las tres modalidades.</p>
      </div>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {TIPOS_HITO.map((h) => (
          <li key={h.tipo} className="px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-800">{h.nombre}</span>
              <span className={`${chip} text-[11px] ${h.momento === "antes" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{h.momento === "antes" ? "Antes de iniciar" : "Durante la ejecución"}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{h.descripcion}</p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-500">Ejemplo de hito personalizado: «Presentación de los resultados» al final de la ejecución de investigación.</p>
    </>
  );
}
