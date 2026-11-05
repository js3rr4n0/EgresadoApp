"use client";

// Editor del plan de trabajo del equipo (entrega P3). El líder estructura y asigna responsables; cada integrante
// completa lo que está a su cargo. Las reglas salen de la etapa "Plan de trabajo" de la ficha. El servidor vuelve a
// validar todo (actions/planTrabajo.ts); aquí se replica para avisar antes.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarPlanTrabajo, guardarPlanTrabajo, revisarPlanTrabajo, type DatosPlan } from "@/app/actions/planTrabajo";
import { aplanar, cargaPorIds, numerar, planIndividual, responsables, totalesNodo, validarPlanEquipo, type NodoPlan, type ProblemaPlan } from "@/lib/fichas/planTrabajo";

const NIVEL = ["", "Objetivo general", "Objetivo específico", "Macroactividad", "Actividad", "Subactividad"];
const HIJO = ["", "objetivo", "macroactividad", "actividad", "subactividad", ""];
const ESTADO: Record<string, { texto: string; clase: string }> = {
  redactando: { texto: "En elaboración", clase: "bg-amber-100 text-amber-800" },
  enviado: { texto: "Enviado al asesor", clase: "bg-blue-100 text-blue-800" },
  observado: { texto: "Con observaciones", clase: "bg-red-100 text-red-700" },
  aprobado: { texto: "Aprobado", clase: "bg-emerald-100 text-emerald-700" },
};

function actualizar(n: NodoPlan, id: string, f: (x: NodoPlan) => NodoPlan): NodoPlan {
  if (n.id === id) return f(n);
  return { ...n, hijos: n.hijos.map((h) => actualizar(h, id, f)) };
}
function quitar(n: NodoPlan, id: string): NodoPlan {
  return { ...n, hijos: n.hijos.filter((h) => h.id !== id).map((h) => quitar(h, id)) };
}
function buscarPadre(n: NodoPlan, id: string): NodoPlan | null {
  for (const h of n.hijos) {
    if (h.id === id) return n;
    const p = buscarPadre(h, id);
    if (p) return p;
  }
  return null;
}
const dinero = (v: number, moneda: string) => (v ? `${moneda === "USD" ? "$" : `${moneda} `}${v.toLocaleString("es-SV")}` : "");

export default function PlanTrabajoEquipo({ datos }: { datos: DatosPlan }) {
  const router = useRouter();
  const { etapa, columnas, equipo, rol, miId } = datos;
  const [arbol, setArbol] = useState<NodoPlan>(datos.plan.arbol);
  const [version, setVersion] = useState(datos.plan.version);
  const [sucio, setSucio] = useState(false);
  const [vista, setVista] = useState<number>(0); // 0 = general; id de integrante = su plan individual
  const [periodo, setPeriodo] = useState(1);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string; problemas?: ProblemaPlan[] } | null>(null);
  const [comentario, setComentario] = useState("");
  const [pendiente, iniciar] = useTransition();

  const equipoMultiple = equipo.length > 1;
  const estado = datos.plan.estado;
  const editableEstado = (rol === "lider" || rol === "integrante") && (estado === "redactando" || estado === "observado");
  const resp = useMemo(() => responsables(arbol), [arbol]);
  const problemas = useMemo(() => validarPlanEquipo(arbol, etapa, equipo.map((i) => i.id), columnas.length), [arbol, etapa, equipo, columnas.length]);
  const carga = useMemo(() => cargaPorIds(arbol, equipo.map((i) => i.id), columnas.length), [arbol, equipo, columnas.length]);
  // Nombre corto: primer nombre y última palabra (en equipos con nombres parecidos, la última los distingue).
  const nombre = (id: number | null | undefined) => {
    const p = equipo.find((i) => i.id === id)?.nombre.trim().split(/\s+/) ?? [];
    return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : (p[0] ?? "");
  };

  const porSub = etapa.granularidad === "subperiodo";
  const periodos = Math.max(...columnas.map((c) => c.periodo), 1);
  const visibles = columnas.map((c, i) => ({ ...c, i })).filter((c) => !porSub || c.periodo === periodo);
  const nivelResp = etapa.equipo.responsable === "objetivo" ? 2 : 4;
  const maxNivel = etapa.subactividades === "no" ? 4 : 5;

  const mostrado = vista === 0 ? arbol : planIndividual(arbol, vista);
  const filas = mostrado ? aplanar(mostrado) : [];

  const puedeEditar = (n: NodoPlan) => editableEstado && vista === 0 && (rol === "lider" || resp.get(n.id) === miId);
  const puedeAgregar = (n: NodoPlan) => editableEstado && vista === 0 && n.nivel < maxNivel && (rol === "lider" || (n.nivel >= 2 && resp.get(n.id) === miId));
  const puedeQuitar = (n: NodoPlan) => {
    if (!editableEstado || vista !== 0 || n.nivel === 1) return false;
    if (rol === "lider") return true;
    const padre = buscarPadre(arbol, n.id);
    return !!padre && resp.get(padre.id) === miId && resp.get(n.id) === miId;
  };

  function cambiar(nuevo: NodoPlan) {
    setArbol(numerar(nuevo));
    setSucio(true);
    setMensaje(null);
  }
  const agregar = (padre: NodoPlan) =>
    cambiar(actualizar(arbol, padre.id, (p) => ({
      ...p,
      montos: [],
      hijos: [...p.hijos, { id: crypto.randomUUID(), codigo: "", nivel: (p.nivel + 1) as NodoPlan["nivel"], titulo: "", responsable: null, montos: [], hijos: [] }],
    })));
  const setMonto = (n: NodoPlan, col: number, valor: number) =>
    cambiar(actualizar(arbol, n.id, (x) => {
      const m = Array.from({ length: columnas.length }, (_, i) => x.montos[i] ?? 0);
      m[col] = Math.max(0, valor || 0);
      return { ...x, montos: m };
    }));

  function ejecutar(accion: () => Promise<{ success: boolean; error?: string; problemas?: ProblemaPlan[]; version?: number }>, exito: string) {
    setMensaje(null);
    iniciar(async () => {
      const r = await accion();
      if (!r.success) return setMensaje({ tipo: "error", texto: r.error ?? "No se pudo completar.", problemas: r.problemas });
      if (r.version) setVersion(r.version);
      setSucio(false);
      setMensaje({ tipo: "ok", texto: exito });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-card-dark">{etapa.nombre}</h1>
            <span className={`text-xs font-bold rounded-md px-2 py-0.5 ${ESTADO[estado]?.clase}`}>{ESTADO[estado]?.texto ?? estado}</span>
            {sucio && <span className="text-xs font-bold text-amber-700">Cambios sin guardar</span>}
          </div>
          <p className="text-sm text-muted mt-1">
            Propuesta #{datos.propuesta.numero} · {datos.propuesta.titulo} · {equipoMultiple ? `equipo de ${equipo.length}` : "individual"}
          </p>
          <p className="text-xs text-muted mt-1">
            {rol === "lider" && "Como líder, estructuras el plan y asignas un responsable a cada " + (nivelResp === 2 ? "objetivo específico." : "actividad.")}
            {rol === "integrante" && "Completa lo que está a tu cargo: títulos, actividades y montos. El líder asigna responsables y envía el plan."}
            {rol === "asesor" && "Revisa la consecuencia lógica y que la carga del equipo sea equitativa antes de aprobar."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {editableEstado && (
            <button type="button" disabled={!sucio || pendiente} onClick={() => ejecutar(() => guardarPlanTrabajo(datos.propuesta.id, arbol, version), "Plan guardado.")}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {pendiente ? "Guardando…" : "Guardar"}
            </button>
          )}
          {editableEstado && rol === "lider" && (
            <button type="button" disabled={pendiente || sucio || problemas.length > 0}
              title={sucio ? "Guarda los cambios antes de enviar" : problemas.length > 0 ? "Corrige los pendientes antes de enviar" : undefined}
              onClick={() => { if (window.confirm("¿Enviar el plan al asesor? Mientras lo revisa no se podrá modificar.")) ejecutar(() => enviarPlanTrabajo(datos.propuesta.id), "Plan enviado al asesor."); }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">
              Enviar al asesor
            </button>
          )}
        </div>
      </div>

      {estado === "observado" && datos.plan.comentarioAsesor && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-sm text-amber-950">
          <strong className="block text-xs uppercase tracking-wide mb-1">Observaciones del asesor</strong>
          <p className="whitespace-pre-wrap">{datos.plan.comentarioAsesor}</p>
        </div>
      )}
      {mensaje && (
        <div role="status" className={`rounded-xl px-4 py-2.5 text-sm border ${mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {mensaje.texto}
          {mensaje.problemas && <ul className="list-disc pl-5 mt-1">{mensaje.problemas.map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>}
        </div>
      )}
      {editableEstado && problemas.length > 0 && (
        <details className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
          <summary className="cursor-pointer font-bold">{problemas.length} pendiente{problemas.length === 1 ? "" : "s"} antes de enviar al asesor</summary>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">{problemas.slice(0, 30).map((p, i) => <li key={i}>{p.mensaje}</li>)}</ul>
        </details>
      )}

      <section className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-xs text-muted max-w-xl">
            Cada nivel suma los montos de sus hijos por {porSub ? "subperíodo" : "período"}, hasta el objetivo general.
            {etapa.presupuesto.activo ? ` Montos en ${etapa.presupuesto.moneda}.` : " Marca en qué columnas se ejecuta cada actividad."}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {equipoMultiple && etapa.equipo.planIndividual && (
              <div role="tablist" aria-label="Plan" className="inline-flex bg-gray-100 rounded-lg p-1">
                {[{ id: 0, nombre: "General" }, ...equipo].map((i) => (
                  <button key={i.id} role="tab" type="button" aria-selected={vista === i.id} onClick={() => setVista(i.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${vista === i.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                    {i.id === 0 ? "General" : i.id === miId ? "Mi plan" : nombre(i.id)}
                  </button>
                ))}
              </div>
            )}
            {porSub && (
              <label className="text-[11px] font-bold text-gray-500 uppercase">
                Período{" "}
                <select className="ml-1 h-8 border border-gray-300 rounded-md px-2 text-sm normal-case font-normal" value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
                  {Array.from({ length: periodos }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[48rem] border border-gray-200">
            <thead className="bg-gray-800 text-white text-[11px] uppercase">
              <tr>
                <th className="text-left px-2 py-1.5 w-20">ID</th>
                <th className="text-left px-2 py-1.5 min-w-[16rem]">Descripción</th>
                {equipoMultiple && <th className="text-left px-2 py-1.5 w-36">Responsable</th>}
                {visibles.map((c) => <th key={c.i} className="text-right px-1.5 py-1.5 w-20">{porSub ? `S${c.sub}` : c.texto}</th>)}
                <th className="text-right px-2 py-1.5 w-24">{etapa.presupuesto.activo ? "Total" : ""}</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((n) => {
                const totales = totalesNodo(n, columnas.length);
                const hoja = n.hijos.length === 0 && n.nivel >= 4;
                const editable = puedeEditar(n);
                const asignable = equipoMultiple && rol === "lider" && editableEstado && vista === 0 && n.nivel === nivelResp;
                return (
                  <tr key={n.id} className={n.nivel === 1 ? "bg-gray-100 font-bold" : n.nivel === 2 ? "bg-sky-50/60 font-bold" : n.nivel === 3 ? "font-bold text-gray-700" : "text-gray-700"}>
                    <td className="px-2 py-1 font-mono text-gray-500 align-top pt-2">{n.codigo}</td>
                    <td className="px-2 py-1" style={{ paddingLeft: `${0.5 + (n.nivel - 1) * 0.9}rem` }}>
                      {editable && n.nivel > 1 ? (
                        <input aria-label={`Título de ${n.codigo}`} value={n.titulo} placeholder={NIVEL[n.nivel]} maxLength={500}
                          onChange={(e) => cambiar(actualizar(arbol, n.id, (x) => ({ ...x, titulo: e.target.value })))}
                          className="w-full h-8 border border-gray-200 rounded-md px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/25" />
                      ) : (
                        <span>{n.titulo || <em className="text-gray-400">{NIVEL[n.nivel]} sin título</em>}</span>
                      )}
                    </td>
                    {equipoMultiple && (
                      <td className="px-2 py-1">
                        {asignable ? (
                          <select aria-label={`Responsable de ${n.codigo}`} value={n.responsable ?? ""} className="h-8 w-full border border-gray-200 rounded-md px-1 text-xs bg-white"
                            onChange={(e) => cambiar(actualizar(arbol, n.id, (x) => ({ ...x, responsable: e.target.value ? Number(e.target.value) : null })))}>
                            <option value="">Sin asignar</option>
                            {equipo.map((i) => <option key={i.id} value={i.id}>{nombre(i.id)}</option>)}
                          </select>
                        ) : (
                          <span className="text-gray-500">{n.nivel >= 2 ? nombre(resp.get(n.id)) : ""}</span>
                        )}
                      </td>
                    )}
                    {visibles.map((c) => (
                      <td key={c.i} className="px-1.5 py-1 text-right tabular-nums">
                        {hoja && editable ? (
                          etapa.presupuesto.activo ? (
                            <input aria-label={`Monto de ${n.codigo} en ${c.texto}`} type="number" min={0} step="0.01" value={n.montos[c.i] || ""}
                              onChange={(e) => setMonto(n, c.i, Number(e.target.value))}
                              className="w-full h-8 border border-gray-200 rounded-md px-1 text-right text-xs bg-white" />
                          ) : (
                            <input aria-label={`${n.codigo} se ejecuta en ${c.texto}`} type="checkbox" checked={(n.montos[c.i] ?? 0) > 0} onChange={(e) => setMonto(n, c.i, e.target.checked ? 1 : 0)} />
                          )
                        ) : etapa.presupuesto.activo ? dinero(totales[c.i], etapa.presupuesto.moneda)
                          : totales[c.i] > 0 ? <span className="inline-block w-full h-2.5 bg-brand-red/70 rounded-sm" aria-label="Se ejecuta" /> : ""}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right tabular-nums font-bold">{etapa.presupuesto.activo ? dinero(totales.reduce((a, b) => a + b, 0), etapa.presupuesto.moneda) : ""}</td>
                    <td className="px-1 py-1 text-right whitespace-nowrap">
                      {puedeAgregar(n) && (
                        <button type="button" onClick={() => agregar(n)} className="text-[11px] font-bold text-brand-red hover:underline mr-2">+ {HIJO[n.nivel]}</button>
                      )}
                      {puedeQuitar(n) && (
                        <button type="button" aria-label={`Quitar ${n.codigo}`} onClick={() => { if (n.hijos.length === 0 || window.confirm(`¿Quitar ${n.codigo} y todo lo que contiene?`)) cambiar(quitar(arbol, n.id)); }}
                          className="text-[11px] font-bold text-gray-400 hover:text-red-700">Quitar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {vista !== 0 && !mostrado && <p className="text-sm text-muted">Este integrante todavía no tiene actividades a su cargo.</p>}
        {vista !== 0 && <p className="text-[11px] text-muted">Plan individual: el plan general filtrado por responsable. Para editar, vuelve a la vista General.</p>}
      </section>

      {equipoMultiple && etapa.equipo.panelCarga && (
        <section className="bg-white border border-border rounded-xl p-5 shadow-xs">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Carga por integrante</h2>
          <div className="grid sm:grid-cols-3 gap-2">
            {carga.map((c) => (
              <div key={c.integrante} className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                <div className="font-bold text-gray-800 text-sm">{equipo.find((i) => i.id === c.integrante)?.nombre}</div>
                {c.objetivos} objetivos · {c.macroactividades} macro · {c.actividades} actividades
                {etapa.presupuesto.activo && <div>Presupuesto: {dinero(c.monto, etapa.presupuesto.moneda) || "—"}</div>}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2">El sistema no decide si el reparto es equitativo: lo revisa el asesor al aprobar el plan.</p>
        </section>
      )}

      {rol === "asesor" && estado === "enviado" && (
        <section className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-3">
          <h2 className="font-bold text-card-dark">Revisión del plan</h2>
          {etapa.aprobacion.validaSupervisor && <p className="text-xs text-muted">Recuerda: el supervisor de la institución valida el plan y queda documentado en tu informe de primer contacto.</p>}
          <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} aria-label="Observaciones para el equipo"
            placeholder="Observaciones para el equipo (obligatorias si pides ajustes)"
            className="w-full p-3 rounded-lg border border-gray-300 text-sm" />
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" disabled={pendiente} onClick={() => ejecutar(() => revisarPlanTrabajo(datos.propuesta.id, "observar", comentario), "Observaciones enviadas al equipo.")}
              className="px-4 py-2 rounded-lg text-sm font-bold border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50">
              Pedir ajustes
            </button>
            <button type="button" disabled={pendiente} onClick={() => { if (window.confirm("¿Aprobar el plan de trabajo del equipo?")) ejecutar(() => revisarPlanTrabajo(datos.propuesta.id, "aprobar", comentario), "Plan aprobado."); }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
              Aprobar plan
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
