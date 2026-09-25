import Link from "next/link";

interface PaginacionProps {
  paginaActual: number;
  totalPaginas: number;
  totalElementos: number;
  tamanoPagina: number;
  /** Construye el href de una página conservando los demás parámetros de la vista. */
  construirHref: (pagina: number) => string;
}

export function paginar<T>(elementos: T[], pagina: number, tamanoPagina: number) {
  const totalPaginas = Math.max(1, Math.ceil(elementos.length / tamanoPagina));
  const paginaActual = Math.min(Math.max(1, pagina || 1), totalPaginas);
  const inicio = (paginaActual - 1) * tamanoPagina;
  return { items: elementos.slice(inicio, inicio + tamanoPagina), paginaActual, totalPaginas };
}

export default function Paginacion({
  paginaActual,
  totalPaginas,
  totalElementos,
  tamanoPagina,
  construirHref,
}: PaginacionProps) {
  if (totalPaginas <= 1) return null;

  const desde = (paginaActual - 1) * tamanoPagina + 1;
  const hasta = Math.min(paginaActual * tamanoPagina, totalElementos);
  const botonBase = "px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors";

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100" aria-label="Paginación">
      <p className="text-[11px] text-slate-500 font-semibold">
        Mostrando {desde}–{hasta} de {totalElementos}
      </p>
      <div className="flex items-center gap-1.5">
        {paginaActual > 1 ? (
          <Link href={construirHref(paginaActual - 1)} scroll={false} className={`${botonBase} border-slate-200 text-slate-700 hover:bg-slate-100`}>
            Anterior
          </Link>
        ) : (
          <span className={`${botonBase} border-slate-100 text-slate-300`}>Anterior</span>
        )}
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) =>
          n === paginaActual ? (
            <span key={n} aria-current="page" className={`${botonBase} border-slate-900 bg-slate-900 text-white`}>
              {n}
            </span>
          ) : (
            <Link key={n} href={construirHref(n)} scroll={false} className={`${botonBase} border-slate-200 text-slate-700 hover:bg-slate-100`}>
              {n}
            </Link>
          )
        )}
        {paginaActual < totalPaginas ? (
          <Link href={construirHref(paginaActual + 1)} scroll={false} className={`${botonBase} border-slate-200 text-slate-700 hover:bg-slate-100`}>
            Siguiente
          </Link>
        ) : (
          <span className={`${botonBase} border-slate-100 text-slate-300`}>Siguiente</span>
        )}
      </div>
    </nav>
  );
}
