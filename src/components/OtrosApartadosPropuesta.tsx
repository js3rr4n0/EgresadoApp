// «Otros apartados de la propuesta»: los espacios de la ficha sin columna de la fase 1 (lib/fichas/espaciosExtraPropuesta.ts).
import type { EspacioExtra } from "@/lib/fichas/espaciosExtraPropuesta";

export default function OtrosApartadosPropuesta({ espacios }: { espacios: EspacioExtra[] }) {
  if (espacios.length === 0) return null;
  return (
    <div style={{ pageBreakAfter: "always" }} className="pt-8">
      <h2 className="text-xl font-bold uppercase mb-6 border-b-2 border-brand-red pb-2">Otros apartados de la propuesta</h2>
      <div className="space-y-6">
        {espacios.map((x) => (
          <section key={x.id} className="print:break-inside-avoid border p-4 rounded bg-gray-50">
            <h3 className="text-md font-bold text-gray-900 mb-2 uppercase">{x.titulo}</h3>
            {x.texto ? <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">{x.texto}</p> : null}
            {x.bloques.map((b, k) => (
              <div key={k} className="mt-2">
                {b.persona && <p className="text-sm font-bold text-gray-700 mb-1">{b.persona}</p>}
                <dl className="space-y-1.5 text-sm">
                  {b.campos.map((c) => (
                    <div key={c.etiqueta}>
                      <dt className="font-bold text-gray-700">{c.etiqueta}</dt>
                      <dd className="text-gray-800 whitespace-pre-line">{c.texto}{c.tipo === "archivo" || c.tipo === "imagen" ? " (adjunto en el sistema)" : ""}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {!x.texto && x.bloques.every((b) => b.campos.length === 0) && <p className="text-sm italic text-gray-400">Sin respuesta.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
