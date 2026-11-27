// Piezas de la revisión de una propuesta (A1), compartidas por la administración y la coordinación (D4).

import MediaZoomViewer from "@/components/MediaZoomViewer";
import type { PersonaEmpresa } from "@/lib/expedientePropuesta";

export function Tarjeta({ numero, titulo, descripcion, children, accion }: { numero: number; titulo: string; descripcion?: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white">{numero}</span>
          <div>
            <h2 className="font-bold text-card-dark">{titulo}</h2>
            {descripcion && <p className="text-xs text-muted mt-0.5">{descripcion}</p>}
          </div>
        </div>
        {accion}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{etiqueta}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">{valor || <span className="text-muted">Sin dato</span>}</dd>
    </div>
  );
}

export function Persona({ p, rol }: { p: PersonaEmpresa; rol: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0 text-sm">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{rol}</p>
        <p className="font-semibold text-card-dark">{p.nombre}</p>
        <p className="text-xs text-gray-600">{[p.cargo, p.correo, p.telefono].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="w-28 shrink-0 text-center">
        {p.firmaUrl ? (
          <MediaZoomViewer url={p.firmaUrl} alt={`Firma de ${p.nombre}`} isSignature />
        ) : (
          <span className="text-[11px] text-muted">Sin firma registrada</span>
        )}
      </div>
    </div>
  );
}
