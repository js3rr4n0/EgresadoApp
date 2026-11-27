// Encabezado rojo de las páginas del coordinador (pedido del usuario, 27-nov-2026): retoma el panel con degradado que
// tenía el panel anterior, con la etiqueta, el título y qué se hace en la página. Sin emojis.

export default function EncabezadoCoordinacion({
  titulo,
  children,
  etiqueta = "Coordinación de trabajos de graduación",
  extra,
}: {
  titulo: string;
  /** Qué se hace en la página. */
  children?: React.ReactNode;
  etiqueta?: string;
  /** Contenido a la derecha (por ejemplo, un número destacado). */
  extra?: React.ReactNode;
}) {
  return (
    <header className="rounded-2xl border border-rose-800 bg-gradient-to-r from-brand-red via-red-800 to-rose-950 p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-4xl">
          <span className="mb-3 inline-block rounded-full border border-rose-700/50 bg-rose-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-200">
            {etiqueta}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{titulo}</h1>
          {children && <p className="mt-2 text-sm leading-relaxed text-rose-100">{children}</p>}
        </div>
        {extra && <div className="shrink-0">{extra}</div>}
      </div>
    </header>
  );
}
