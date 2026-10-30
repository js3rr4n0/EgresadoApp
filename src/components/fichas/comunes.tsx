// Piezas compartidas del constructor de fichas. Sin estado: se usan desde componentes de servidor y de cliente.
import type { EstadoVersion, Modalidad } from "@/lib/fichas/tipos";

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  pasantia: "Pasantía",
  proyecto: "Proyecto",
  investigacion: "Investigación",
};

const ESTILO_ESTADO: Record<EstadoVersion, string> = {
  habilitada: "bg-emerald-100 text-emerald-700",
  borrador: "bg-amber-100 text-amber-800",
  retirada: "bg-gray-100 text-gray-600",
};

const TEXTO_ESTADO: Record<EstadoVersion, string> = {
  habilitada: "Habilitada",
  borrador: "Borrador",
  retirada: "Deshabilitada",
};

export function EstadoVersionBadge({ estado, texto }: { estado: EstadoVersion; texto?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md whitespace-nowrap ${ESTILO_ESTADO[estado]}`}>
      {texto ?? TEXTO_ESTADO[estado]}
    </span>
  );
}

/** Etiqueta para controles que se ven pero cuya función llega en una entrega posterior. */
export function Proximamente({ texto = "Próximamente" }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 whitespace-nowrap">
      <span aria-hidden="true">◷</span>
      {texto}
    </span>
  );
}

/** Aviso al inicio de las pestañas que todavía son solo de diseño. */
export function AvisoDiseno({ entrega, children }: { entrega: string; children?: React.ReactNode }) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl px-4 py-2.5 text-sm flex flex-wrap items-center gap-2">
      <Proximamente texto={entrega} />
      <span>{children ?? "Diseño de referencia: puedes explorarlo, pero los cambios todavía no se guardan."}</span>
    </div>
  );
}
