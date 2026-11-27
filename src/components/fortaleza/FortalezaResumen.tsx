// Resumen de la fortaleza de una propuesta (R3) para el asesor, el coordinador, la administración y el egresado.
// Componente de servidor: no muestra nada si la ficha no tiene problema, justificación ni alcance.

import { fortalezaDePropuesta } from "@/lib/fortalezaServidor";
import { UMBRAL_FORTALEZA } from "@/lib/fortaleza";
import BarraFortaleza from "./BarraFortaleza";

export default async function FortalezaResumen({ propuestaId, paraAsesor = false, lateral = false }: { propuestaId: number; paraAsesor?: boolean; /** Columna angosta (menú de pasos del egresado). */ lateral?: boolean }) {
  let f;
  try {
    f = await fortalezaDePropuesta(propuestaId);
  } catch {
    return null; // columnas todavía no creadas en esta base
  }
  if (f.porcentaje == null) return null;
  return (
    <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <header className={`${lateral ? "px-3 py-2" : "px-5 py-3"} border-b border-border bg-gray-50`}>
        <h2 className="font-bold text-card-dark">Fortaleza de la propuesta</h2>
        <p className="text-xs text-muted">
          {paraAsesor
            ? `Qué tan completos están los apartados clave. Con menos de 100 % puede convenir pedir ajustes.`
            : `Mínimo para enviar: ${UMBRAL_FORTALEZA} % en cada apartado y en total.`}
        </p>
        {f.anterior && (
          <p className="text-xs text-amber-800 mt-1">
            Esta propuesta se redactó antes del indicador: cada apartado está en un solo texto (por eso marca 25 %) y los
            objetivos no se escribieron pensando en la revisión SMART.
          </p>
        )}
      </header>
      <div className={lateral ? "p-3 space-y-3" : "p-5 space-y-4"}>
        <BarraFortaleza porcentaje={f.porcentaje} titulo="Total" apilada={lateral} />
        <div className="space-y-2.5 pt-2 border-t border-border">
          {f.elementos.map((e) => (
            <BarraFortaleza key={e.elemento} porcentaje={e.porcentaje} titulo={e.titulo} compacta apilada={lateral} />
          ))}
        </div>
      </div>
    </section>
  );
}
