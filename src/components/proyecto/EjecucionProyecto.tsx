"use client";

// Ejecución del proyecto en equipo (entrega P4). El integrante registra, por período, las actividades de su plan
// individual; el asesor ve al equipo completo (quién hizo qué) y revisa cada registro. Reglas: etapa de ejecución
// de la ficha (avance, palabras, marco teórico). El servidor valida todo otra vez (actions/ejecucionProyecto.ts).
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarRegistroPlan, revisarRegistroPlan, type DatosEjecucion, type RegistroPlan } from "@/app/actions/ejecucionProyecto";
import { actividadesDelPeriodo, aplanar, avancePorNodo, responsables, validarRegistroProyecto, type NodoPlan } from "@/lib/fichas/planTrabajo";

const ESTADO: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: "Sin registrar", clase: "bg-gray-100 text-gray-600" },
  borrador: { texto: "Borrador", clase: "bg-amber-100 text-amber-800" },
  enviado: { texto: "Enviado", clase: "bg-blue-100 text-blue-800" },
  observado: { texto: "Con observaciones", clase: "bg-red-100 text-red-700" },
  aprobado: { texto: "Aprobado", clase: "bg-emerald-100 text-emerald-700" },
};
const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-SV", { day: "numeric", month: "short" }) : "");

function Insignia({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? ESTADO.pendiente;
  return <span className={`text-[11px] font-bold rounded-md px-2 py-0.5 whitespace-nowrap ${e.clase}`}>{e.texto}</span>;
}

/** Ruta de la actividad en el plan: objetivo específico › macroactividad › actividad. */
function ruta(raiz: NodoPlan, id: string): NodoPlan[] {
  const rec = (n: NodoPlan, camino: NodoPlan[]): NodoPlan[] | null => {
    if (n.id === id) return [...camino, n];
    for (const h of n.hijos) {
      const r = rec(h, [...camino, n]);
      if (r) return r;
    }
    return null;
  };
  return (rec(raiz, []) ?? []).slice(1);
}

function FormRegistro({ datos, nodo, periodo, registro, editable }: {
  datos: DatosEjecucion; nodo: NodoPlan; periodo: number; registro: RegistroPlan | undefined; editable: boolean;
}) {
  const router = useRouter();
  const { reglas } = datos;
  const [avance, setAvance] = useState<string>(registro?.avance != null ? String(registro.avance) : "");
  const [acciones, setAcciones] = useState(registro?.acciones ?? "");
  const [resultado, setResultado] = useState(registro?.resultado ?? "");
  const [marco, setMarco] = useState(registro?.marcoTeorico ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; problemas?: string[] } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const valores = { avance: avance === "" ? null : Number(avance), acciones, resultado, marcoTeorico: marco };
  const problemas = validarRegistroProyecto(valores, reglas);
  const rango = ({ min, max }: { min: number; max: number }) => (min && max ? `${min}–${max} palabras` : min ? `mín. ${min} palabras` : max ? `máx. ${max} palabras` : "sin límite de palabras");

  const guardar = (enviar: boolean) =>
    iniciar(async () => {
      setMsg(null);
      const r = await guardarRegistroPlan(datos.plan.propuesta.id, nodo.id, periodo, valores, enviar);
      if (!r.success) return setMsg({ ok: false, texto: r.error, problemas: r.problemas });
      setMsg({ ok: true, texto: enviar ? "Registro enviado al asesor." : "Borrador guardado." });
      router.refresh();
    });

  const campo = "w-full p-3 rounded-lg border border-gray-300 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-600";
  return (
    <div className="space-y-3">
      {registro?.estado === "observado" && registro.comentarioAsesor && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-950">
          <strong className="block text-[11px] uppercase tracking-wide">Observación del asesor</strong>
          {registro.comentarioAsesor}
        </div>
      )}
      {reglas.avance && (
        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
          Avance de la actividad
          <input type="number" min={0} max={100} value={avance} disabled={!editable} onChange={(e) => setAvance(e.target.value)}
            className="w-20 h-9 border border-gray-300 rounded-md px-2 text-right disabled:bg-gray-50" aria-label={`Avance de ${nodo.codigo}`} />
          %
        </label>
      )}
      <label className="block text-sm font-bold text-gray-700">
        Acciones realizadas <span className="font-normal text-xs text-gray-500">({rango(reglas.acciones)} · llevas {palabras(acciones)})</span>
        <textarea rows={4} value={acciones} disabled={!editable} onChange={(e) => setAcciones(e.target.value)} className={`${campo} mt-1`}
          placeholder="Describe cómo se ejecutó la actividad: fechas, inversiones realizadas y acciones." />
      </label>
      <label className="block text-sm font-bold text-gray-700">
        Resultado obtenido <span className="font-normal text-xs text-gray-500">({rango(reglas.resultado)} · llevas {palabras(resultado)})</span>
        <textarea rows={3} value={resultado} disabled={!editable} onChange={(e) => setResultado(e.target.value)} className={`${campo} mt-1`}
          placeholder="Qué se obtuvo y cómo contribuye a la macroactividad y al objetivo." />
      </label>
      {reglas.marcoTeorico !== "no" && (
        <label className="block text-sm font-bold text-gray-700">
          Marco teórico {reglas.marcoTeorico === "opcional" && <span className="font-normal text-xs text-gray-500">(opcional: solo si hace falta contextualizar la actividad)</span>}
          <textarea rows={2} value={marco} disabled={!editable} onChange={(e) => setMarco(e.target.value)} className={`${campo} mt-1`} />
        </label>
      )}
      <div className="flex items-center justify-between gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-500">
        <span>Anexos de evidencia (imágenes, documentos)</span>
        <span className="text-indigo-700 font-bold">◷ Próximamente</span>
      </div>
      {msg && (
        <div className={`text-sm rounded-lg px-3 py-2 border ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {msg.texto}
          {msg.problemas && <ul className="list-disc pl-5">{msg.problemas.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}
      {editable && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {problemas.length > 0 && <span className="text-xs text-amber-800 mr-auto">{problemas[0]}</span>}
          <button type="button" disabled={pendiente} onClick={() => guardar(false)} className="px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">Guardar borrador</button>
          <button type="button" disabled={pendiente || problemas.length > 0} onClick={() => guardar(true)} className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">Enviar al asesor</button>
        </div>
      )}
    </div>
  );
}

function RevisionAsesor({ datos, registro }: { datos: DatosEjecucion; registro: RegistroPlan }) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const revisar = (d: "aprobar" | "observar") =>
    iniciar(async () => {
      const r = await revisarRegistroPlan(datos.plan.propuesta.id, registro.id, d, comentario);
      if (!r.success) return setMsg(r.error);
      router.refresh();
    });
  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} aria-label="Observación para el integrante"
        placeholder="Observación para el integrante (obligatoria si pides ajustes)" className="w-full p-2.5 rounded-lg border border-gray-300 text-sm" />
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={pendiente} onClick={() => revisar("observar")} className="px-3.5 py-2 rounded-lg text-sm font-bold border border-amber-300 text-amber-800 bg-amber-50 disabled:opacity-50">Pedir ajustes</button>
        <button type="button" disabled={pendiente} onClick={() => revisar("aprobar")} className="px-3.5 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white disabled:opacity-50">Aprobar registro</button>
      </div>
    </div>
  );
}

export default function EjecucionProyecto({ datos }: { datos: DatosEjecucion }) {
  const { plan, periodos, periodoActual, registros } = datos;
  const arbol = plan.plan.arbol;
  const esAsesor = plan.rol === "asesor";
  const [periodo, setPeriodo] = useState(periodoActual);
  const [abierto, setAbierto] = useState<string | null>(null);

  const resp = useMemo(() => responsables(arbol), [arbol]);
  const actividades = useMemo(() => actividadesDelPeriodo(arbol, periodo, plan.columnas), [arbol, periodo, plan.columnas]);
  const regDe = (nodoId: string) => registros.find((r) => r.nodoId === nodoId && r.periodo === periodo);
  // Último avance registrado de cada actividad (de cualquier período, el más reciente con avance).
  const avance = useMemo(() => {
    const ultimo = new Map<string, { periodo: number; avance: number }>();
    for (const r of registros) {
      if (r.avance === null || r.estado === "borrador") continue;
      const u = ultimo.get(r.nodoId);
      if (!u || r.periodo > u.periodo) ultimo.set(r.nodoId, { periodo: r.periodo, avance: r.avance });
    }
    return avancePorNodo(arbol, new Map([...ultimo].map(([k, v]) => [k, v.avance])));
  }, [registros, arbol]);
  const nombre = (id: number | null | undefined) => plan.equipo.find((i) => i.id === id)?.nombre ?? "";
  const mias = actividades.filter((a) => resp.get(a.id) === plan.miId);
  const p = periodos[periodo - 1];

  const resumen = plan.equipo.map((i) => {
    const suyas = actividades.filter((a) => resp.get(a.id) === i.id);
    const est = suyas.map((a) => regDe(a.id)?.estado ?? "pendiente");
    return { ...i, total: suyas.length, enviadas: est.filter((e) => e === "enviado" || e === "aprobado").length, aprobadas: est.filter((e) => e === "aprobado").length };
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-card-dark">Ejecución del proyecto</h1>
          <p className="text-sm text-muted mt-1">Propuesta #{plan.propuesta.numero} · {plan.propuesta.titulo}</p>
          <p className="text-xs text-muted mt-1">
            {esAsesor ? "Revisa los registros de cada integrante: el sistema muestra quién hizo qué." : "Registra las actividades de tu plan individual planificadas en el período."}
            {" "}Avance del proyecto: <strong>{avance.get(arbol.id) ?? 0}%</strong>.
          </p>
        </div>
        <label className="text-[11px] font-bold text-gray-500 uppercase">
          Período{" "}
          <select value={periodo} onChange={(e) => { setPeriodo(Number(e.target.value)); setAbierto(null); }} className="ml-1 h-9 border border-gray-300 rounded-md px-2 text-sm normal-case font-normal">
            {periodos.map((x) => (
              <option key={x.numero} value={x.numero} disabled={!esAsesor && x.numero > periodoActual}>
                {x.numero}{x.desde ? ` · ${fecha(x.desde)}–${fecha(x.hasta)}` : ""}{x.numero > periodoActual ? " (aún no)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="grid sm:grid-cols-3 gap-2">
        {resumen.map((i) => (
          <div key={i.id} className={`bg-white border rounded-xl px-4 py-3 text-xs text-gray-600 ${i.id === plan.miId ? "border-brand-red" : "border-border"}`}>
            <div className="font-bold text-gray-800 text-sm">{i.nombre}{i.lider ? " · líder" : ""}</div>
            Período {periodo}: {i.total} actividades · {i.enviadas} enviadas · {i.aprobadas} aprobadas
          </div>
        ))}
      </section>

      {!esAsesor && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-card-dark">Mis actividades del período {periodo}{p?.desde ? ` (${fecha(p.desde)} al ${fecha(p.hasta)})` : ""}</h2>
          {mias.length === 0 && <p className="text-sm text-muted bg-white border border-border rounded-xl p-4">No tienes actividades planificadas en este período.</p>}
          {mias.map((a) => {
            const r = regDe(a.id);
            const editable = !r || r.estado === "borrador" || r.estado === "observado";
            return (
              <div key={a.id} className="bg-white border border-border rounded-xl shadow-xs">
                <button type="button" onClick={() => setAbierto(abierto === a.id ? null : a.id)} aria-expanded={abierto === a.id}
                  className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-gray-500 mr-2">{a.codigo}</span>
                    <span className="font-bold text-sm text-gray-800">{a.titulo}</span>
                    <span className="block text-[11px] text-gray-500">{ruta(arbol, a.id).slice(0, -1).map((n) => n.titulo).join(" › ")}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Avance {avance.get(a.id) ?? 0}%</span>
                    <Insignia estado={r?.estado ?? "pendiente"} />
                  </span>
                </button>
                {abierto === a.id && (
                  <div className="px-4 pb-4">
                    <FormRegistro key={`${a.id}-${periodo}-${r?.estado ?? "nuevo"}`} datos={datos} nodo={a} periodo={periodo} registro={r} editable={editable} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="bg-white border border-border rounded-xl shadow-xs overflow-hidden">
        <h2 className="text-sm font-bold text-card-dark px-4 pt-4 pb-2">Equipo · período {periodo}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[40rem]">
            <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
              <tr><th className="text-left px-4 py-2 w-20">ID</th><th className="text-left px-2 py-2">Actividad</th><th className="text-left px-2 py-2">Responsable</th><th className="text-right px-2 py-2">Avance</th><th className="text-left px-2 py-2">Estado</th><th className="w-20" /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actividades.map((a) => {
                const r = regDe(a.id);
                const ver = `ver-${a.id}`;
                return (
                  <FilaEquipo key={a.id} a={a} r={r} nombre={nombre(resp.get(a.id))} avance={avance.get(a.id) ?? 0}
                    abierto={abierto === ver} onToggle={() => setAbierto(abierto === ver ? null : ver)} datos={datos} esAsesor={esAsesor} />
                );
              })}
              {actividades.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-muted">No hay actividades planificadas en este período.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted px-4 py-2 border-t border-gray-100">
          Objetivos: {aplanar(arbol).filter((n) => n.nivel === 2).map((o) => `${o.codigo} ${avance.get(o.id) ?? 0}%`).join(" · ")}
        </p>
      </section>
    </div>
  );
}

function FilaEquipo({ a, r, nombre, avance, abierto, onToggle, datos, esAsesor }: {
  a: NodoPlan; r: RegistroPlan | undefined; nombre: string; avance: number; abierto: boolean; onToggle: () => void; datos: DatosEjecucion; esAsesor: boolean;
}) {
  const visible = r && r.estado !== "borrador";
  return (
    <>
      <tr>
        <td className="px-4 py-2 font-mono text-xs text-gray-500">{a.codigo}</td>
        <td className="px-2 py-2 text-gray-800">{a.titulo}</td>
        <td className="px-2 py-2 text-gray-600">{nombre}</td>
        <td className="px-2 py-2 text-right tabular-nums">{avance}%</td>
        <td className="px-2 py-2"><Insignia estado={r?.estado ?? "pendiente"} /></td>
        <td className="px-2 py-2 text-right">
          {visible && <button type="button" onClick={onToggle} aria-expanded={abierto} className="text-xs font-bold text-brand-red hover:underline">{abierto ? "Cerrar" : esAsesor && r.estado === "enviado" ? "Revisar" : "Ver"}</button>}
        </td>
      </tr>
      {abierto && visible && (
        <tr>
          <td colSpan={6} className="px-4 pb-4 bg-gray-50/60">
            <dl className="text-sm text-gray-700 space-y-2 pt-2">
              <div><dt className="text-[11px] font-bold text-gray-500 uppercase">Avance</dt><dd>{r.avance ?? "—"}%</dd></div>
              <div><dt className="text-[11px] font-bold text-gray-500 uppercase">Acciones realizadas</dt><dd className="whitespace-pre-wrap">{r.acciones}</dd></div>
              <div><dt className="text-[11px] font-bold text-gray-500 uppercase">Resultado</dt><dd className="whitespace-pre-wrap">{r.resultado}</dd></div>
              {r.marcoTeorico && <div><dt className="text-[11px] font-bold text-gray-500 uppercase">Marco teórico</dt><dd className="whitespace-pre-wrap">{r.marcoTeorico}</dd></div>}
              {r.comentarioAsesor && <div><dt className="text-[11px] font-bold text-gray-500 uppercase">Observación del asesor</dt><dd>{r.comentarioAsesor}</dd></div>}
            </dl>
            {esAsesor && r.estado === "enviado" && <RevisionAsesor datos={datos} registro={r} />}
          </td>
        </tr>
      )}
    </>
  );
}
