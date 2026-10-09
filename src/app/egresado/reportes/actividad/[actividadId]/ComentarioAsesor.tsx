import type { MarcaTexto } from "@/lib/comentariosRevision";

/** Comentarios del asesor sobre un apartado de la actividad (el apartado completo y frases concretas), junto a ese apartado. */
export default function ComentarioAsesor({
  texto,
  marcas = [],
  observado,
}: {
  texto?: string;
  marcas?: MarcaTexto[];
  observado: boolean;
}) {
  if (!texto && marcas.length === 0) return null;
  return (
    <div
      className={`p-3 rounded-lg border-l-4 space-y-1.5 ${
        observado ? "bg-amber-50 border-amber-400 text-amber-950" : "bg-slate-50 border-slate-300 text-slate-700"
      }`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-wide">
        {observado ? "Corrección solicitada por su asesor designado" : "Comentario de su asesor designado"}
      </p>
      {texto && <p className="text-xs font-medium whitespace-pre-wrap">{texto}</p>}
      {marcas.length > 0 && (
        <ol className="space-y-1">
          {marcas.map((m, i) => (
            <li key={m.id} className="text-xs font-medium">
              <span className="font-extrabold">{i + 1}.</span> <span className="italic opacity-80">«{m.fragmento}»</span>: {m.texto}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
