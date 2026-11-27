// D3: barra de búsqueda y filtros de una lista del coordinador. Formulario GET: funciona sin JavaScript y deja los
// filtros en la dirección.

import Link from "next/link";
import { hayFiltros, type Filtros } from "@/lib/filtrosListado";

export interface OpcionFiltro {
  valor: string;
  texto: string;
}

export default function FiltrosListado({
  base,
  filtros,
  placeholder = "Buscar por título o egresado",
  modalidades,
  carreras,
  estados,
  etiquetaEstado = "Estado",
}: {
  base: string;
  filtros: Filtros;
  placeholder?: string;
  modalidades?: OpcionFiltro[];
  carreras?: OpcionFiltro[];
  estados?: OpcionFiltro[];
  etiquetaEstado?: string;
}) {
  const select = "h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-gray-800 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20";
  return (
    <form action={base} method="get" className="flex flex-wrap items-end gap-2" role="search">
      <label className="flex-1 min-w-[14rem]">
        <span className="sr-only">Buscar</span>
        <input
          type="search"
          name="q"
          defaultValue={filtros.q}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </label>
      {modalidades && (
        <label>
          <span className="sr-only">Modalidad</span>
          <select name="modalidad" defaultValue={filtros.modalidad} className={select}>
            <option value="">Todas las modalidades</option>
            {modalidades.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </label>
      )}
      {carreras && carreras.length > 1 && (
        <label>
          <span className="sr-only">Carrera</span>
          <select name="carrera" defaultValue={filtros.carrera} className={select}>
            <option value="">Todas las carreras</option>
            {carreras.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </label>
      )}
      {estados && (
        <label>
          <span className="sr-only">{etiquetaEstado}</span>
          <select name="estado" defaultValue={filtros.estado} className={select}>
            <option value="">{`${etiquetaEstado}: todos`}</option>
            {estados.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
        </label>
      )}
      <button type="submit" className="h-9 rounded-lg bg-gray-900 px-4 text-xs font-bold text-white hover:bg-gray-800">
        Filtrar
      </button>
      {hayFiltros(filtros) && (
        <Link href={base} className="h-9 inline-flex items-center rounded-lg border border-border px-3 text-xs font-bold text-gray-700 hover:bg-gray-50">
          Limpiar
        </Link>
      )}
    </form>
  );
}
