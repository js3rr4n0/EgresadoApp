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
  retirada: "Retirada",
};

export function EstadoVersionBadge({ estado, texto }: { estado: EstadoVersion; texto?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md whitespace-nowrap ${ESTILO_ESTADO[estado]}`}>
      {texto ?? TEXTO_ESTADO[estado]}
    </span>
  );
}
