"use client";

// Protocolo de investigación (entrega I3): sus partes salen de la etapa "Protocolo" de la ficha. Redacta el líder;
// en equipo, todos ratifican la versión final (protocolo + plan) y el líder lo envía con el plan de trabajo.
// El asesor lo ve en lectura y emite su dictamen en la pestaña del plan.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ratificarProtocolo, type DatosProtocolo } from "@/app/actions/protocolo";
import type { DatosPlan } from "@/app/actions/planTrabajo";
import { esRecurso } from "@/lib/fichas/elementosRecurso";
import TextoEspacioForm from "./TextoEspacioForm";
import RecursoEspacioForm from "./RecursoEspacioForm";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });

/** base: consulta de la pestaña (por ejemplo "?id=71&tab=protocolo"); cada parte agrega "&paso=n". */
export default function ProtocoloEquipo({ datos, plan, paso, base }: { datos: DatosProtocolo; plan: DatosPlan; paso: number; base: string }) {
  const hrefPaso = (n: number) => `${base}&paso=${n}`;
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const { etapa, respuestas, precargas, problemas, ratificacion } = datos;
  const estado = plan.plan.estado;
  const editable = estado === "redactando" || estado === "observado";
  const esLider = plan.rol === "lider";
  const enEquipo = plan.rol === "lider" || plan.rol === "integrante";
  const total = etapa.espacios.length;
  const actual = Math.min(Math.max(paso, 1), total);
  const e = etapa.espacios[actual - 1];
  const pendientesDe = (id: string) => problemas.filter((p) => p.espacioId === id).length + (precargas[id] ? 1 : 0);
  const miFirma = ratificacion.firmas.find((f) => f.usuarioId === plan.miId);
  const nav = { pasoSiguiente: Math.min(actual + 1, total), pasoAnterior: actual > 1 ? actual - 1 : null, hrefPaso };

  function ratificar() {
    setMensaje(null);
    iniciar(async () => {
      const r = await ratificarProtocolo(plan.propuesta.id);
      if (!r.success) return setMensaje({ tipo: "error", texto: r.error });
      setMensaje({ tipo: "ok", texto: "Ratificaste la versión actual del protocolo y el plan." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-1">
        <h1 className="text-xl font-bold text-card-dark">{etapa.nombre}</h1>
        <p className="text-sm text-muted">Propuesta #{plan.propuesta.numero} · {plan.propuesta.titulo}</p>
        <p className="text-xs text-muted">
          La portada y el índice se generan con los datos del trabajo, y el cronograma de actividades es el plan de trabajo (pestaña Plan de trabajo).
          {esLider && editable && " Como líder, redactas el protocolo; el equipo lo ratifica y lo envías junto con el plan."}
          {plan.rol === "integrante" && " Lo redacta el líder; revísalo y ratifícalo cuando esté listo."}
          {plan.rol === "asesor" && ` Tu dictamen escrito vence ${etapa.revision.diasRevision} días ${etapa.revision.diasHabiles ? "hábiles" : ""} después del envío.`}
        </p>
        {datos.fechaLimite && estado === "enviado" && (
          <p className="text-sm font-bold text-blue-800">Dictamen del asesor a más tardar el {fecha(datos.fechaLimite)}.</p>
        )}
      </div>

      {mensaje && (
        <div role="status" className={`rounded-xl px-4 py-2.5 text-sm border ${mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>{mensaje.texto}</div>
      )}

      <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)] gap-4 items-start">
        <nav aria-label="Partes del protocolo" className="bg-white border border-border rounded-xl p-2 shadow-xs">
          <ol className="space-y-0.5">
            {etapa.espacios.map((x, i) => {
              const pend = pendientesDe(x.id);
              const vacio = !respuestas[x.id]?.trim();
              return (
                <li key={x.id}>
                  <Link href={hrefPaso(i + 1)} aria-current={i + 1 === actual ? "step" : undefined}
                    className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${i + 1 === actual ? "bg-red-50 text-brand-red font-bold" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${pend ? "bg-amber-100 text-amber-800" : vacio ? "bg-gray-100 text-gray-500" : "bg-emerald-500 text-white"}`}>
                      {pend ? "!" : vacio ? i + 1 : "✓"}
                    </span>
                    <span className="min-w-0">
                      {x.titulo}
                      {!x.obligatorio && <span className="block text-[10px] font-normal text-muted">opcional</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 space-y-3">
          {e.ayuda?.trim() && <div className="p-4 bg-blue-50 border border-blue-100 text-blue-900 rounded-xl text-sm whitespace-pre-wrap">{e.ayuda}</div>}
          {e.elemento === "texto" && (
            <TextoEspacioForm key={e.id} {...nav} propuestaId={plan.propuesta.id} espacioId={e.id} titulo={e.titulo} descripcion={e.descripcion}
              obligatorio={e.obligatorio} minPalabras={Number(e.parametros.minPalabras) || 0} maxPalabras={Number(e.parametros.maxPalabras) || 0}
              initialData={respuestas[e.id] ?? precargas[e.id] ?? ""} isLocked={!editable} isReadOnly={!esLider}
              aviso={precargas[e.id] ? "Este texto se precargó con lo que escribieron en la propuesta aprobada. Ajústalo si hace falta y guárdalo." : undefined} />
          )}
          {esRecurso(e.elemento) && (
            <RecursoEspacioForm key={e.id} {...nav} propuestaId={plan.propuesta.id} espacio={{ ...e, elemento: e.elemento }} initialData={respuestas[e.id]}
              isLocked={!editable} isReadOnly={!esLider} />
          )}
        </div>
      </div>

      <section className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-card-dark">Envío al asesor</h2>
            <p className="text-xs text-muted">
              El protocolo se envía junto con el plan de trabajo, desde la pestaña Plan de trabajo.
              {ratificacion.requerida && " Antes, cada integrante ratifica la versión final: si alguien cambia el protocolo o el plan, hay que volver a ratificar."}
            </p>
          </div>
          {enEquipo && editable && ratificacion.requerida && (
            <button type="button" disabled={pendiente || miFirma?.vigente} onClick={ratificar}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-brand-red-hover text-white disabled:opacity-50">
              {miFirma?.vigente ? "Ya ratificaste esta versión" : pendiente ? "Ratificando…" : "Ratificar protocolo y plan"}
            </button>
          )}
        </div>
        {problemas.length + Object.keys(precargas).length > 0 ? (
          <p className="text-sm text-amber-800">
            Pendientes del protocolo: {[...Object.keys(precargas).map((id) => `revisar y guardar "${etapa.espacios.find((x) => x.id === id)?.titulo}"`), ...problemas.map((p) => p.mensaje)].join(" · ")}
          </p>
        ) : (
          <p className="text-sm text-emerald-700 font-semibold">El protocolo está completo.</p>
        )}
        {ratificacion.requerida && (
          <ul className="grid sm:grid-cols-3 gap-2">
            {ratificacion.firmas.map((f) => (
              <li key={f.usuarioId} className={`border rounded-lg px-3 py-2 text-xs ${f.vigente ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600"}`}>
                <div className="font-bold text-sm">{f.nombre}</div>
                {f.vigente ? "Ratificó la versión actual" : f.momento ? "Ratificó una versión anterior" : "Sin ratificar"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
