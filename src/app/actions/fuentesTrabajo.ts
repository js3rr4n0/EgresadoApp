"use server";

// Registro de fuentes del trabajo (ajustes al protocolo, 19-nov-2026). Las fuentes tienen los campos APA 7 de pasantía;
// los párrafos citados del protocolo apuntan a ellas y las referencias se arman solas. Las edita quien redacta el
// protocolo (el líder) mientras no se haya enviado. Al cambiar o quitar una fuente se recalculan las citas guardadas.
import { db } from "@/lib/db";
import { fuentesTrabajo, planesTrabajo, propuestas, respuestasEspacios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaInformeFinal, esEtapaProtocolo } from "@/lib/fichas/tipos";
import { leerApartado, guardarComoTexto, tipoApartado } from "@/lib/fichas/apartadosAcademicos";
import { conCitas, guardarParrafos, leerFuente, leerParrafos, type Fuente } from "@/lib/fichas/fuentes";
import { leerDatosCita, type DatosCitaApa } from "@/lib/citaApa";
import { arbolConCitas } from "@/lib/fichas/metodologiaPlan";
import type { NodoPlan } from "@/lib/fichas/planTrabajo";

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string; problemas?: string[] };

const ESTADOS_CON_PLAN = ["aprobada", "primer_contacto_completado", "en_ejecucion"];
const MAX_FUENTES = 200;

/** Fuentes de la propuesta, en el orden en que se registraron. */
export async function fuentesDePropuesta(propuestaId: number): Promise<Fuente[]> {
  const filas = await db.select().from(fuentesTrabajo).where(eq(fuentesTrabajo.propuestaId, propuestaId)).orderBy(asc(fuentesTrabajo.id));
  return filas.flatMap((f) => {
    const datos = leerDatosCita(f.datos);
    return datos ? [{ id: f.id, datos }] : [];
  });
}

/** Quien puede editar el registro: el líder, con la propuesta aprobada y el protocolo sin enviar. */
async function editable(propuestaId: number): Promise<{ ok: true; usuarioId: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { ok: false, error: "No autorizado" };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return { ok: false, error: "La propuesta no existe." };
  if (prop.egresadoId !== session.userId) return { ok: false, error: "Solo el líder del equipo registra las fuentes del protocolo." };
  if (!ESTADOS_CON_PLAN.includes(prop.estado)) return { ok: false, error: "Las fuentes se registran después de aprobada la propuesta." };
  const [plan] = await db.select({ estado: planesTrabajo.estado }).from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  if (plan && (plan.estado === "enviado" || plan.estado === "aprobado")) return { ok: false, error: "El protocolo ya se envió al asesor; no se puede modificar." };
  return { ok: true, usuarioId: session.userId };
}

/**
 * Recalcula la cita guardada en cada párrafo citado de la propuesta (protocolo e informe final) con el registro actual:
 * si una fuente cambió de autor o de año, o se quitó, el texto citado se actualiza.
 */
export async function recalcularCitas(propuestaId: number) {
  const ficha = await fichaDePropuesta(propuestaId);
  if (!ficha) return;
  const espacios = [
    ...(ficha.definicion.etapas.find(esEtapaProtocolo)?.espacios ?? []),
    ...(ficha.definicion.etapas.find(esEtapaInformeFinal)?.espacios ?? []),
  ].filter((e) => e.elemento === "apartado");
  const conCitado = espacios.filter((e) => tipoApartado(e)?.partes.some((p) => p.formato === "citado"));
  const mapa = new Map<number, DatosCitaApa>((await fuentesDePropuesta(propuestaId)).map((f) => [f.id, f.datos]));
  // Metodología de cada objetivo en el plan (cronograma de investigación, E2).
  const [plan] = await db.select({ id: planesTrabajo.id, arbol: planesTrabajo.arbol }).from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  if (plan) {
    const nuevo = arbolConCitas(plan.arbol as NodoPlan, mapa);
    if (JSON.stringify(nuevo) !== JSON.stringify(plan.arbol)) await db.update(planesTrabajo).set({ arbol: nuevo, actualizadoEn: new Date() }).where(eq(planesTrabajo.id, plan.id));
  }
  if (conCitado.length === 0) return;
  const filas = await db.select().from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, propuestaId));
  for (const e of conCitado) {
    const fila = filas.find((f) => f.espacioId === e.id);
    if (!fila?.contenido) continue;
    const tipo = tipoApartado(e)!;
    const c = leerApartado(tipo, fila.contenido);
    let cambio = false;
    for (const p of tipo.partes.filter((x) => x.formato === "citado")) {
      if (!c.partes[p.id]) continue;
      const nuevo = guardarParrafos(conCitas(leerParrafos(c.partes[p.id]), mapa));
      if (nuevo !== c.partes[p.id]) { c.partes[p.id] = nuevo; cambio = true; }
    }
    if (cambio) await db.update(respuestasEspacios).set({ contenido: guardarComoTexto(c), actualizadoEn: new Date() }).where(eq(respuestasEspacios.id, fila.id));
  }
}

function refrescar() {
  revalidatePath("/egresado/plan");
  revalidatePath("/asesor/plan/[propuestaId]", "page");
}

/** Agrega una fuente (id null) o corrige una existente. Devuelve la fuente guardada. */
export async function guardarFuente(propuestaId: number, id: number | null, datos: unknown): Promise<Resultado<{ fuente: Fuente }>> {
  try {
    const ok = await editable(propuestaId);
    if (!ok.ok) return { success: false, error: ok.error };
    const leida = leerFuente(datos);
    if (!leida.ok) return { success: false, error: "La referencia todavía no está completa.", problemas: leida.problemas };
    if (id === null) {
      const actuales = await fuentesDePropuesta(propuestaId);
      if (actuales.length >= MAX_FUENTES) return { success: false, error: `El registro admite hasta ${MAX_FUENTES} fuentes.` };
      const [f] = await db.insert(fuentesTrabajo).values({ propuestaId, datos: leida.datos, creadoPor: ok.usuarioId }).returning({ id: fuentesTrabajo.id });
      refrescar();
      return { success: true, fuente: { id: f.id, datos: leida.datos } };
    }
    const [f] = await db.update(fuentesTrabajo).set({ datos: leida.datos, actualizadoEn: new Date() })
      .where(and(eq(fuentesTrabajo.id, id), eq(fuentesTrabajo.propuestaId, propuestaId))).returning({ id: fuentesTrabajo.id });
    if (!f) return { success: false, error: "La fuente no existe." };
    await recalcularCitas(propuestaId);
    refrescar();
    return { success: true, fuente: { id: f.id, datos: leida.datos } };
  } catch (error) {
    console.error("Error guardarFuente:", error);
    return { success: false, error: "No se pudo guardar la fuente." };
  }
}

/** Quita una fuente del registro; los párrafos que la citaban quedan sin ella (y sin su cita). */
export async function eliminarFuente(propuestaId: number, id: number): Promise<Resultado> {
  try {
    const ok = await editable(propuestaId);
    if (!ok.ok) return { success: false, error: ok.error };
    await db.delete(fuentesTrabajo).where(and(eq(fuentesTrabajo.id, id), eq(fuentesTrabajo.propuestaId, propuestaId)));
    await recalcularCitas(propuestaId);
    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error eliminarFuente:", error);
    return { success: false, error: "No se pudo quitar la fuente." };
  }
}
