"use client";

// Elementos propios publicados en el catálogo (catálogo editable, C2), para agregarlos a una ficha o actualizar su copia
// desde cualquier pestaña del constructor (propuesta, protocolo, informe final) sin pasarlos por cada editor.
import { createContext, useContext } from "react";
import type { ElementoPropio } from "@/app/actions/elementosCatalogo";

const Contexto = createContext<ElementoPropio[]>([]);

export function ProveedorElementosPropios({ propios, children }: { propios: ElementoPropio[]; children: React.ReactNode }) {
  return <Contexto.Provider value={propios}>{children}</Contexto.Provider>;
}

/** Elementos propios publicados (vacío fuera del constructor). */
export const useElementosPropios = () => useContext(Contexto);
