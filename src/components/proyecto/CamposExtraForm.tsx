"use client";

// Campos adicionales de un paso del sistema (catálogo editable, entrega C4): van debajo del formulario del paso, con su
// propio botón de guardar. Los redacta el líder; el resto del equipo y el asesor los ven sin editar.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarCamposExtra } from "@/app/actions/respuestasEspacios";
import type { Espacio } from "@/lib/fichas/tipos";
import { defCamposExtra } from "@/lib/fichas/elementosPropios";
import { leerRespuestaPropia, problemasValores, valoresDe, type Valores } from "@/lib/fichas/respuestasPropias";
import CamposPropios from "./CamposPropios";

export default function CamposExtraForm({ propuestaId, espacio, initialData, puedeEditar }: {
  propuestaId: number;
  espacio: Espacio;
  initialData?: string | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const def = useMemo(() => defCamposExtra(espacio), [espacio]);
  const [valores, setValores] = useState<Valores>(() => valoresDe(leerRespuestaPropia(initialData), def));
  const [pending, setPending] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const pendientes = problemasValores(def, valores);

  const guardar = async () => {
    setPending(true);
    setMensaje(null);
    const r = await guardarCamposExtra(propuestaId, espacio.id, valores);
    setPending(false);
    setMensaje(r.success ? { tipo: "ok", texto: pendientes.length ? "Guardado. Todavía faltan datos para continuar." : "Datos adicionales guardados." } : { tipo: "error", texto: r.error });
    if (r.success) router.refresh();
  };

  return (
    <section className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm" aria-label={`Datos adicionales de ${espacio.titulo}`}>
      <div className="mb-5 border-b border-border pb-3">
        <h3 className="text-lg font-bold text-card-dark">Datos adicionales: {espacio.titulo}</h3>
        <p className="text-xs text-muted mt-1">La ficha pide estos datos además de los del paso. Se guardan con su propio botón.</p>
      </div>
      {mensaje && (
        <div role="status" className={`mb-4 p-3 rounded-lg text-sm font-medium border ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>{mensaje.texto}</div>
      )}
      <CamposPropios def={def} valores={valores} onChange={setValores} disabled={!puedeEditar} prefijo={`extra-${espacio.id}`} />
      {puedeEditar && pendientes.length > 0 && (
        <div className="mt-5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Para continuar falta:</strong>
          <ul className="list-disc pl-5 mt-1">{pendientes.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      {puedeEditar && (
        <div className="flex justify-end pt-5 mt-5 border-t border-border">
          <button type="button" disabled={pending} onClick={guardar}
            className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50">
            {pending ? "Guardando..." : "Guardar datos adicionales"}
          </button>
        </div>
      )}
    </section>
  );
}
