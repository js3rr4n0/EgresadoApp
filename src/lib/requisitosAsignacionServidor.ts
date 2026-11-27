import "server-only";
// D1 (specs/COORDINADOR_ASIGNACION.md): lo que el sistema y la administración deben haber verificado antes de que una
// propuesta llegue al coordinador (o a un asesor directo). Si algo falla, no se puede asignar.

import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartasAceptacion, detallesProyecto, empresas, propuestas, solicitudesEmpresa } from "@/lib/schema";
import { UMBRAL_FORTALEZA } from "@/lib/fortaleza";

export interface Requisito {
  clave: "empresa" | "fortaleza" | "actores" | "carta" | "firmas" | "sin_supervisor";
  titulo: string;
  cumple: boolean;
  /** Qué se revisó o qué falta. */
  detalle: string;
}

export interface RequisitosAsignacion {
  requisitos: Requisito[];
  listo: boolean;
  /** Textos de lo que falta, para mensajes de error. */
  faltan: string[];
}

const NOMBRE_ACTOR: Record<string, string> = { patrocinador: "patrocinador", beneficiario: "beneficiario", ejecutor: "ejecutor", financista: "financista" };
const COLUMNA_ACTOR = { patrocinador: "actorPatrocinador", beneficiario: "actorBeneficiario", ejecutor: "actorEjecutor", financista: "actorFinancista" } as const;

export async function requisitosAsignacion(propuestaId: number): Promise<RequisitosAsignacion> {
  const requisitos: Requisito[] = [];
  const [p] = await db
    .select({ id: propuestas.id, tipo: propuestas.tipo, empresaId: propuestas.empresaId, supervisorId: propuestas.supervisorId, estado: propuestas.estado })
    .from(propuestas)
    .where(eq(propuestas.id, propuestaId));
  if (!p) return { requisitos: [], listo: false, faltan: ["La propuesta no existe."] };

  const { fichaDePropuesta, espaciosPropuesta } = await import("@/lib/fichas/fichaDePropuesta");
  const ficha = await fichaDePropuesta(propuestaId).catch(() => null);
  const espacios = ficha ? espaciosPropuesta(ficha.definicion) : [];
  const pideCarta = espacios.some((e) => e.elemento === "carta");

  // 1. Empresa registrada y válida
  {
    const [emp] = p.empresaId ? await db.select({ nombre: empresas.nombre, habilitada: empresas.habilitada }).from(empresas).where(eq(empresas.id, p.empresaId)) : [];
    const pendientes = await db
      .select({ id: solicitudesEmpresa.id })
      .from(solicitudesEmpresa)
      .where(and(eq(solicitudesEmpresa.propuestaId, propuestaId), eq(solicitudesEmpresa.estado, "pendiente"), ne(solicitudesEmpresa.tipo, "carta"), ne(solicitudesEmpresa.tipo, "datos_alumno")));
    let cumple = false;
    let detalle: string;
    if (!emp) detalle = "La propuesta no tiene una empresa del catálogo.";
    else if (!emp.habilitada) detalle = `${emp.nombre} está deshabilitada en el catálogo.`;
    else if (pendientes.length) detalle = `${emp.nombre}: hay una solicitud de empresa sin resolver.`;
    else { cumple = true; detalle = `${emp.nombre}, registrada y habilitada en el catálogo.`; }
    requisitos.push({ clave: "empresa", titulo: "Empresa registrada y válida", cumple, detalle });
  }

  // 2. Fortaleza de los elementos (R3), si la ficha la mide
  try {
    const { fortalezaDePropuesta } = await import("@/lib/fortalezaServidor");
    const f = await fortalezaDePropuesta(propuestaId);
    if (f.porcentaje != null) {
      const debiles = f.elementos.filter((e) => e.porcentaje < UMBRAL_FORTALEZA);
      const cumple = !debiles.length && f.porcentaje >= UMBRAL_FORTALEZA;
      requisitos.push({
        clave: "fortaleza",
        titulo: "Fortaleza de la propuesta",
        cumple,
        detalle: cumple
          ? `${f.porcentaje} % en total; cada apartado con al menos ${UMBRAL_FORTALEZA} %.`
          : debiles.length
            ? `Por debajo de ${UMBRAL_FORTALEZA} %: ${debiles.map((e) => `${e.titulo} (${e.porcentaje} %)`).join(", ")}.`
            : `Total de ${f.porcentaje} %; necesita al menos ${UMBRAL_FORTALEZA} %.`,
      });
    }
  } catch {
    // columnas de partes todavía no creadas en esta base
  }

  // 3. Actores o involucrados que pide la ficha
  const espacioActores = espacios.find((e) => e.elemento === "actores");
  if (espacioActores) {
    const pedidos = (Array.isArray(espacioActores.parametros.actores) ? espacioActores.parametros.actores : Object.keys(COLUMNA_ACTOR)) as string[];
    const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
    const faltan = pedidos.filter((a) => a in COLUMNA_ACTOR && !String(det?.[COLUMNA_ACTOR[a as keyof typeof COLUMNA_ACTOR]] ?? "").trim());
    requisitos.push({
      clave: "actores",
      titulo: "Actores intervinientes",
      cumple: faltan.length === 0,
      detalle: faltan.length ? `Falta: ${faltan.map((a) => NOMBRE_ACTOR[a] ?? a).join(", ")}.` : `Completos: ${pedidos.map((a) => NOMBRE_ACTOR[a] ?? a).join(", ")}.`,
    });
  }

  if (pideCarta) {
    // 4. Firmantes y supervisor resueltos, sin solicitudes de «carta» pendientes (R5). En pasantía no se eligen
    //    firmantes: basta el supervisor de la propuesta.
    const [carta] = await db.select({ archivoUrl: cartasAceptacion.archivoUrl }).from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
    let est: { listo: boolean; pendiente: boolean } | null;
    if (p.tipo === "pasantia") {
      est = { listo: p.supervisorId != null, pendiente: false };
    } else {
      const { estadoPersonasCartaDe } = await import("@/lib/personasCartaServidor");
      est = await estadoPersonasCartaDe(propuestaId).catch(() => null);
    }
    const cartaOk = !!carta?.archivoUrl && !!est?.listo;
    requisitos.push({
      clave: "carta",
      titulo: "Carta de aceptación",
      cumple: cartaOk,
      detalle: !carta?.archivoUrl
        ? "No hay carta de aceptación subida."
        : est?.pendiente
          ? "La administración todavía no valida los firmantes o el supervisor nuevos."
          : !est?.listo
            ? (p.tipo === "pasantia" ? "Falta el supervisor empresarial." : "Faltan los firmantes o el supervisor empresarial.")
            : (p.tipo === "pasantia" ? "Carta subida y supervisor empresarial registrado." : "Firmantes y supervisor elegidos y validados."),
    });

    // 5. Firmas verificadas por la administración (A4; requisito desde D1, respuesta 4)
    const { estadoVerificacionFirmas } = await import("@/lib/verificacionFirmasServidor");
    const firmas = await estadoVerificacionFirmas(propuestaId).catch(() => null);
    requisitos.push({
      clave: "firmas",
      titulo: "Firmas verificadas",
      cumple: firmas?.verificada === true,
      detalle: firmas?.verificada
        ? `Verificadas${firmas.quien ? ` por ${firmas.quien}` : ""}.`
        : firmas?.cambioDespues
          ? "La carta o las personas cambiaron después de verificar las firmas: hay que verificarlas de nuevo."
          : "La administración todavía no marca «Firmas verificadas».",
    });

    // 6. Sin supervisor: aprobado por la administración (D2)
    const { constanciaSinSupervisor } = await import("@/lib/constanciaSinSupervisorServidor");
    const c = await constanciaSinSupervisor(propuestaId).catch(() => ({ estado: "no_aplica" as const }));
    if (c.estado !== "no_aplica") {
      requisitos.push({
        clave: "sin_supervisor",
        titulo: "Sin supervisor empresarial",
        cumple: c.estado === "validada",
        detalle: c.estado === "validada" ? "Validado por decanato sin supervisor empresarial." : "La solicitud de trabajar sin supervisor espera la aprobación de la administración.",
      });
    }
  }

  const faltan = requisitos.filter((r) => !r.cumple).map((r) => `${r.titulo}: ${r.detalle}`);
  return { requisitos, listo: faltan.length === 0, faltan };
}

/** Mensaje de error del servidor cuando se intenta asignar sin cumplir los requisitos. */
export function errorRequisitos(r: RequisitosAsignacion, quien: "administracion" | "coordinador"): string {
  const base = quien === "administracion"
    ? "No se puede asignar todavía: falta cumplir requisitos de la propuesta."
    : "Esta propuesta no cumple los requisitos que debía verificar la administración; recházala por requisitos o pide a la administración que lo revise.";
  return `${base} ${r.faltan.join(" ")}`;
}

/** Requisitos de varias propuestas (para las listas). */
export async function requisitosDeVarias(ids: number[]): Promise<Map<number, RequisitosAsignacion>> {
  const mapa = new Map<number, RequisitosAsignacion>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return mapa;
  // existen todas (evita consultas para ids borrados)
  const vivos = await db.select({ id: propuestas.id }).from(propuestas).where(inArray(propuestas.id, unicos));
  const res = await Promise.all(vivos.map(async (v) => [v.id, await requisitosAsignacion(v.id)] as const));
  for (const [id, r] of res) mapa.set(id, r);
  return mapa;
}
