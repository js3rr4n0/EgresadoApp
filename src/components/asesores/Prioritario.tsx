// Marca «Prioritario» de un asesor (A6): estrella dibujada (no emoji) y el texto. Sin estado: sirve en servidor y cliente.

export default function Prioritario({ motivo }: { motivo?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-px text-[10px] font-bold text-amber-800" title={motivo ?? undefined}>
      <svg className="h-3 w-3 fill-amber-500" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L10 14.9l-5.25 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
      </svg>
      Prioritario
    </span>
  );
}
