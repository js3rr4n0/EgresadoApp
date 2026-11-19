"use client";

// Recursos y presupuesto del protocolo (ajustes al protocolo, 19-nov-2026). Los recursos se agrupan por las categorías
// que pide la ficha, cada una con su ayuda y un ejemplo; si la ficha pide costos, cada recurso lleva cantidad y costo
// unitario, y el presupuesto (total por categoría y total general) se calcula solo. El servidor valida al guardar.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarRespuestaRecursos } from "@/app/actions/respuestasEspacios";
import { CATEGORIAS_RECURSO, formatoMonto, leerRecursos, presupuesto, problemasRecursos, reglasRecursos, totalRecurso, type CategoriaRecurso, type Recurso } from "@/lib/fichas/recursos";
import type { Espacio } from "@/lib/fichas/tipos";

interface Props {
  propuestaId: number;
  espacio: Espacio;
  initialData?: string | null;
  isLocked: boolean;
  isReadOnly?: boolean;
  pasoSiguiente: number;
  pasoAnterior: number | null;
  hrefPaso: (n: number) => string;
}

const campo = "w-full p-2 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/25 disabled:bg-slate-50 disabled:text-slate-600";

export default function RecursosPresupuestoForm({ propuestaId, espacio, initialData, isLocked, isReadOnly = false, pasoSiguiente, pasoAnterior, hrefPaso }: Props) {
  const router = useRouter();
  const reglas = reglasRecursos(espacio);
  const [recursos, setRecursos] = useState<Recurso[]>(() => leerRecursos(initialData));
  const [pending, setPending] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cambios, setCambios] = useState(false);
  const disabled = isLocked || isReadOnly;
  const resumen = useMemo(() => presupuesto(recursos), [recursos]);
  const problemas = problemasRecursos(espacio, recursos);

  const cambiar = (lista: Recurso[]) => { setRecursos(lista); setCambios(true); setMensaje(null); };
  const editar = (i: number, cambios: Partial<Recurso>) => cambiar(recursos.map((r, k) => (k === i ? { ...r, ...cambios } : r)));
  const num = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Number(v.replace(",", ".")) || 0));

  async function guardar(avanzar: boolean) {
    setPending(true);
    setMensaje(null);
    const res = await guardarRespuestaRecursos(propuestaId, espacio.id, recursos);
    setPending(false);
    if (!res.success) return setMensaje({ tipo: "error", texto: res.error });
    setCambios(false);
    setMensaje({ tipo: "ok", texto: problemas.length ? `Borrador guardado. ${problemas[0]}` : `${espacio.titulo} guardado.` });
    if (avanzar) router.push(hrefPaso(pasoSiguiente));
    router.refresh();
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 lg:p-7 shadow-sm space-y-5">
      <div className="border-b border-border pb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-red">Recursos y presupuesto</p>
        <h2 className="text-xl font-bold text-card-dark">{espacio.titulo} {!espacio.obligatorio && <span className="text-xs font-medium text-muted">(opcional)</span>}</h2>
        {espacio.descripcion && <p className="text-sm text-muted mt-1">{espacio.descripcion}</p>}
        <p className="text-xs text-muted mt-2">
          Identifique los recursos que necesita la investigación, por categoría.
          {reglas.conCostos ? " Indique la cantidad y el costo unitario: el presupuesto se calcula solo." : ""}
          {reglas.minimo ? ` Al menos ${reglas.minimo} recurso(s).` : ""}
        </p>
      </div>

      {mensaje && (
        <div role="status" className={`p-3 rounded-lg text-sm font-medium border ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>{mensaje.texto}</div>
      )}

      {CATEGORIAS_RECURSO.filter((c) => reglas.categorias.includes(c.valor)).map((c) => {
        const indices = recursos.map((r, i) => (r.categoria === c.valor ? i : -1)).filter((i) => i >= 0);
        const subtotal = resumen.porCategoria.find((x) => x.categoria === c.valor)?.total ?? 0;
        return (
          <section key={c.valor} className="border border-gray-200 rounded-lg">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-gray-200 rounded-t-lg">
              <div>
                <h3 className="text-sm font-bold text-card-dark">{c.etiqueta}</h3>
                <p className="text-[11px] text-muted">{c.ayuda} Ej.: {c.ejemplo}</p>
              </div>
              {reglas.conCostos && indices.length > 0 && <span className="text-xs font-bold text-card-dark">{formatoMonto(subtotal, reglas.moneda)}</span>}
            </div>
            <div className="p-2 space-y-2">
              {indices.length === 0 && <p className="text-xs text-muted px-1">Sin recursos en esta categoría.</p>}
              {indices.map((i) => {
                const r = recursos[i];
                return (
                  <div key={i} className={`grid gap-2 items-center ${reglas.conCostos ? "sm:grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}>
                    <input aria-label={`Descripción del recurso (${c.etiqueta})`} className={campo} disabled={disabled} maxLength={300} value={r.descripcion}
                      placeholder={c.ejemplo} onChange={(e) => editar(i, { descripcion: e.target.value })} />
                    {reglas.conCostos && (
                      <>
                        <input aria-label="Cantidad" type="number" min={0} step="any" className={campo} disabled={disabled} value={r.cantidad ?? ""} placeholder="Cantidad"
                          onChange={(e) => editar(i, { cantidad: num(e.target.value) })} />
                        <input aria-label="Costo unitario" type="number" min={0} step="0.01" className={campo} disabled={disabled} value={r.costoUnitario ?? ""} placeholder="Costo unitario"
                          onChange={(e) => editar(i, { costoUnitario: num(e.target.value) })} />
                        <span className="text-sm font-bold text-right text-card-dark">{formatoMonto(totalRecurso(r), reglas.moneda)}</span>
                      </>
                    )}
                    {!disabled && (
                      <button type="button" aria-label="Quitar el recurso" onClick={() => cambiar(recursos.filter((_, k) => k !== i))} className="text-gray-400 hover:text-red-700 font-bold px-2">✕</button>
                    )}
                  </div>
                );
              })}
              {!disabled && (
                <button type="button" onClick={() => cambiar([...recursos, { categoria: c.valor as CategoriaRecurso, descripcion: "" }])}
                  className="text-xs font-bold text-gray-600 hover:text-brand-red px-1">+ Agregar recurso</button>
              )}
            </div>
          </section>
        );
      })}

      {reglas.conCostos && (
        <section aria-label="Presupuesto" className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <h3 className="text-sm font-bold text-card-dark px-3 py-2 bg-slate-50 border-b border-gray-200">Presupuesto</h3>
          <table className="w-full text-sm">
            <tbody>
              {resumen.porCategoria.map((x) => (
                <tr key={x.categoria} className="border-b border-gray-100">
                  <td className="px-3 py-1.5">{x.etiqueta}</td>
                  <td className="px-3 py-1.5 text-xs text-muted">{x.recursos} recurso(s)</td>
                  <td className="px-3 py-1.5 text-right font-medium">{formatoMonto(x.total, reglas.moneda)}</td>
                </tr>
              ))}
              {resumen.porCategoria.length === 0 && <tr><td className="px-3 py-2 text-xs text-muted">Todavía no hay recursos.</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-right">{formatoMonto(resumen.total, reglas.moneda)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {problemas.length > 0 && <ul className="text-xs text-amber-800 list-disc pl-5">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
        {pasoAnterior !== null ? (
          <button type="button" onClick={() => router.push(hrefPaso(pasoAnterior))} className="px-4 py-2 text-sm font-bold text-muted hover:text-card-dark">← Volver al paso anterior</button>
        ) : <span />}
        {!disabled && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {cambios && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
            <button type="button" disabled={pending} onClick={() => guardar(false)}
              className="px-5 py-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold text-sm disabled:opacity-50">Guardar borrador</button>
            <button type="button" disabled={pending} onClick={() => guardar(true)}
              className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm shadow-sm disabled:opacity-50">{pending ? "Guardando…" : "Guardar y continuar"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
