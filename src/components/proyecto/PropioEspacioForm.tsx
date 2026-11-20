"use client";

// Paso de un elemento propio del catálogo en la propuesta o el protocolo (catálogo editable, entrega C3). Por trabajo lo
// redacta el líder; por integrante, cada uno su parte y ve las de los demás. El asesor lo ve sin editar.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarRespuestaPropia } from "@/app/actions/respuestasEspacios";
import type { Espacio } from "@/lib/fichas/tipos";
import { bloquesRespuesta, conValores, guardarRespuesta, leerRespuestaPropia, problemasValores, valoresDe, type Valores } from "@/lib/fichas/respuestasPropias";
import CamposPropios from "./CamposPropios";

interface Props {
  propuestaId: number;
  espacio: Espacio;
  initialData?: string | null;
  /** Usuario que ve el paso y los integrantes del trabajo (líder incluido), para las respuestas por integrante. */
  miId: number;
  integrantes: { id: number; nombre: string }[];
  esLider: boolean;
  isLocked: boolean;
  pasoSiguiente: number;
  pasoAnterior: number | null;
  hrefPaso?: (n: number) => string;
}

export default function PropioEspacioForm({ propuestaId, espacio, initialData, miId, integrantes, esLider, isLocked, pasoSiguiente, pasoAnterior, hrefPaso }: Props) {
  const router = useRouter();
  const ir = hrefPaso ?? ((n: number) => `?id=${propuestaId}&step=${n}`);
  const def = espacio.propio?.definicion;
  const respuesta = useMemo(() => leerRespuestaPropia(initialData), [initialData]);
  const porIntegrante = def?.alcance === "integrante";
  const soyIntegrante = integrantes.some((i) => i.id === miId);
  const puedeEditar = !isLocked && (porIntegrante ? soyIntegrante : esLider);
  const [valores, setValores] = useState<Valores>(() => (def ? valoresDe(respuesta, def, porIntegrante ? miId : null) : {}));
  const [pending, setPending] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string; pendientes?: string[] } | null>(null);

  if (!def) return <div className="bg-white border border-border rounded-xl p-6 text-sm text-red-700">A este paso le falta la copia del elemento en la ficha. Avisa a la coordinación.</div>;
  const pendientes = problemasValores(def, valores);
  const otros = porIntegrante ? bloquesRespuesta(def, initialData, integrantes).filter((b) => b.persona !== integrantes.find((i) => i.id === miId)?.nombre) : [];

  const guardar = async (avanzar: boolean) => {
    setPending(true);
    setMensaje(null);
    const r = await guardarRespuestaPropia(propuestaId, espacio.id, valores);
    setPending(false);
    if (!r.success) return setMensaje({ tipo: "error", texto: r.error });
    if (avanzar && pendientes.length === 0) {
      router.push(ir(pasoSiguiente));
      router.refresh();
      return;
    }
    setMensaje(avanzar && pendientes.length ? { tipo: "error", texto: "Se guardó, pero faltan datos para continuar:", pendientes } : { tipo: "ok", texto: `${espacio.titulo} guardado.` });
    router.refresh();
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-bold text-card-dark">{espacio.titulo}</h2>
        {(espacio.descripcion || def.descripcion) && <p className="text-sm text-muted mt-1">{espacio.descripcion || def.descripcion}</p>}
        {espacio.ayuda && <p className="text-sm text-slate-700 mt-2">{espacio.ayuda}</p>}
        {porIntegrante && <p className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3">Cada integrante responde este paso por separado.{soyIntegrante ? " Aquí llenas tu parte." : ""}</p>}
        {!porIntegrante && !esLider && soyIntegrante && <p className="text-xs text-muted mt-2">Lo redacta el líder del equipo.</p>}
      </div>

      {mensaje && (
        <div role="status" className={`mb-6 p-4 rounded-lg text-sm font-medium border ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
          {mensaje.texto}
          {mensaje.pendientes && <ul className="list-disc pl-5 mt-1">{mensaje.pendientes.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      {(soyIntegrante || !porIntegrante) && (
        <CamposPropios def={def} valores={valores} onChange={setValores} disabled={!puedeEditar} prefijo={`esp-${espacio.id}`} />
      )}

      {porIntegrante && (
        <div className="mt-6 space-y-3">
          {otros.length > 0 && <h3 className="text-xs font-bold text-muted uppercase tracking-wide">{soyIntegrante ? "Lo que respondieron los demás integrantes" : "Respuestas de los integrantes"}</h3>}
          {otros.map((b) => (
            <div key={b.persona} className="border border-border rounded-lg p-3 bg-slate-50">
              <div className="text-sm font-bold text-card-dark mb-1">{b.persona}</div>
              <dl className="space-y-1 text-sm">{b.campos.map((c) => <div key={c.etiqueta}><dt className="font-bold text-slate-600 inline">{c.etiqueta}: </dt><dd className="inline whitespace-pre-line">{c.texto}</dd></div>)}</dl>
            </div>
          ))}
          {integrantes.filter((i) => i.id !== miId && !otros.some((b) => b.persona === i.nombre)).map((i) => (
            <p key={i.id} className="text-xs text-muted">{i.nombre}: todavía no responde.</p>
          ))}
        </div>
      )}

      {puedeEditar && pendientes.length > 0 && (
        <div className="mt-6 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Para continuar falta:</strong>
          <ul className="list-disc pl-5 mt-1">{pendientes.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-8">
        {pasoAnterior !== null ? (
          <button type="button" onClick={() => router.push(ir(pasoAnterior))} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark transition-colors cursor-pointer">
            ← Volver al paso anterior
          </button>
        ) : <span />}
        {puedeEditar ? (
          <div className="flex items-center gap-3">
            <button type="button" disabled={pending} onClick={() => guardar(false)}
              className="px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm transition-colors disabled:opacity-50 cursor-pointer">
              Guardar Borrador
            </button>
            <button type="button" disabled={pending} onClick={() => guardar(true)}
              className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
              {pending ? "Guardando..." : "Guardar y Continuar"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => router.push(ir(pasoSiguiente))} className="px-5 py-2.5 rounded-lg border border-border text-sm font-bold text-card-dark hover:bg-slate-50">Siguiente paso →</button>
        )}
      </div>
    </div>
  );
}

/**
 * Elemento propio como capítulo del informe final (C3): el capítulo se guarda entero (con versiones), así que este
 * editor devuelve el JSON completo. Por integrante, cada uno edita su parte y ve las de los demás.
 */
export function CapituloPropio({ espacio, contenido, onChange, disabled, miId, integrantes }: {
  espacio: Espacio;
  contenido: string;
  onChange: (valor: string) => void;
  disabled: boolean;
  miId: number;
  integrantes: { id: number; nombre: string }[];
}) {
  const def = espacio.propio?.definicion;
  if (!def) return <p className="text-sm text-red-700">A este capítulo le falta la copia del elemento en la ficha.</p>;
  const r = leerRespuestaPropia(contenido);
  const cambiar = (usuarioId: number | null, v: Valores) => onChange(guardarRespuesta(conValores(r, def, usuarioId, v)));
  if (def.alcance !== "integrante") {
    return <CamposPropios def={def} valores={valoresDe(r, def)} onChange={(v) => cambiar(null, v)} disabled={disabled} prefijo={`cap-${espacio.id}`} />;
  }
  const orden = [...integrantes].sort((a, b) => (a.id === miId ? -1 : b.id === miId ? 1 : 0));
  return (
    <div className="space-y-5">
      {orden.map((i) => (
        <section key={i.id} className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-dark mb-3">{i.nombre}{i.id === miId ? " (tu parte)" : ""}</h3>
          <CamposPropios def={def} valores={valoresDe(r, def, i.id)} onChange={(v) => cambiar(i.id, v)} disabled={disabled || i.id !== miId} prefijo={`cap-${espacio.id}-${i.id}`} />
        </section>
      ))}
    </div>
  );
}
