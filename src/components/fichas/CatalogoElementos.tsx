"use client";

import { useState } from "react";
import { CATALOGO } from "@/lib/fichas/catalogo";
import { CAMPOS_ELEMENTO } from "@/lib/fichas/disenoFuturo";
import type { ClaveElemento } from "@/lib/fichas/tipos";
import { ETIQUETA_MODALIDAD, Proximamente } from "./comunes";

const GRUPOS = ["Generales", "Institución", "Planificación", "Proyecto", "Documentos", "Recursos"] as const;

/** Catálogo de elementos con sus campos y reglas. La edición del catálogo es de una entrega posterior. */
export default function CatalogoElementos() {
  const [abierto, setAbierto] = useState<ClaveElemento>("empresa");
  const el = CATALOGO[abierto];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          Los elementos son las piezas con las que se arma cada ficha. Cada uno tiene campos (lo que llena el egresado) y reglas (lo que configura el administrador en la ficha).
        </p>
        <button type="button" disabled title="Entrega posterior"
          className="px-3.5 py-2 rounded-lg text-sm font-bold border border-dashed border-gray-300 text-gray-400 cursor-not-allowed shrink-0">
          + Nuevo elemento
        </button>
      </div>

      <div className="grid md:grid-cols-[12.5rem_minmax(0,1fr)] gap-4">
        <nav className="bg-white border border-gray-200 rounded-xl p-2 space-y-3 self-start" aria-label="Elementos del catálogo">
          {GRUPOS.map((g) => (
            <div key={g}>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide px-2 mb-1">{g}</div>
              {Object.values(CATALOGO).filter((x) => x.grupo === g).map((x) => (
                <button key={x.clave} type="button" onClick={() => setAbierto(x.clave)} aria-current={abierto === x.clave}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm ${abierto === x.clave ? "bg-red-50 text-brand-red font-bold" : "text-gray-700 hover:bg-gray-50"}`}>
                  {x.nombre}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 min-w-0">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{el.grupo}</div>
            <h2 className="text-lg font-bold text-gray-800">{el.nombre}</h2>
            <p className="text-sm text-gray-600 mt-1">{el.descripcion}</p>
            <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
              {el.modalidades.map((m) => <span key={m} className="bg-gray-100 text-gray-700 rounded-md px-2 py-0.5 font-bold">{ETIQUETA_MODALIDAD[m]}</span>)}
              <span className="bg-blue-50 text-blue-700 rounded-md px-2 py-0.5 font-bold">{el.alcance === "integrante" ? "Una respuesta por integrante" : "Una respuesta por trabajo"}</span>
              {el.repetible && <span className="bg-purple-50 text-purple-700 rounded-md px-2 py-0.5 font-bold">Se puede repetir</span>}
              {el.requiere.map((r) => <span key={r} className="bg-amber-50 text-amber-800 rounded-md px-2 py-0.5 font-bold">Va después de {CATALOGO[r].nombre}</span>)}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Campos que llena el egresado</h3>
              <Proximamente texto="Editar campos: entrega posterior" />
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
                      Valor actual:{" "}
                      {p.tipo === "numero" ? `${p.porDefecto}${p.sufijo ? ` ${p.sufijo}` : ""} (de ${p.min} a ${p.max})` : p.tipo === "booleano" ? (p.porDefecto ? "sí" : "no") : p.porDefecto.map((v) => p.opciones.find((o) => o.valor === v)?.etiqueta).join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
