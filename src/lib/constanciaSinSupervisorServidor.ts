import "server-only";
// D2 (specs/COORDINADOR_ASIGNACION.md): constancia de que la administración (el decanato) aprobó que la propuesta
// trabaje sin supervisor empresarial. Solo vale mientras la carta siga marcada «sin supervisor».

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartasAceptacion, solicitudesEmpresa, usuarios, validacionesSinSupervisor } from "@/lib/schema";
import type { DatosSolicitudCarta } from "@/lib/personasCarta";

export type ConstanciaSinSupervisor =
  | { estado: "no_aplica" }
  /** La carta pide trabajar sin supervisor y la administración todavía no responde. */
  | { estado: "pendiente"; motivoEgresado: string }
  | {
      estado: "validada";
      motivoEgresado: string;
      /** null en aprobaciones anteriores a D2, que no pedían mensaje. */
      mensaje: string | null;
      validadaPor: string | null;
      validadaEn: string | null;
    };

export async function constanciaSinSupervisor(propuestaId: number): Promise<ConstanciaSinSupervisor> {
  const [carta] = await db
    .select({ sinSupervisor: cartasAceptacion.sinSupervisor, motivo: cartasAceptacion.motivoSinSupervisor })
    .from(cartasAceptacion)
    .where(eq(cartasAceptacion.propuestaId, propuestaId));
  if (!carta?.sinSupervisor) return { estado: "no_aplica" };

  const solicitudes = await db
    .select({ id: solicitudesEmpresa.id, estado: solicitudesEmpresa.estado, datos: solicitudesEmpresa.datos, revisadoPor: solicitudesEmpresa.revisadoPor, revisadoEn: solicitudesEmpresa.revisadoEn })
    .from(solicitudesEmpresa)
    .where(and(eq(solicitudesEmpresa.propuestaId, propuestaId), eq(solicitudesEmpresa.tipo, "carta"), inArray(solicitudesEmpresa.estado, ["pendiente", "aprobada"])))
    .orderBy(desc(solicitudesEmpresa.id));
  const ultima = solicitudes.find((s) => !!(s.datos as DatosSolicitudCarta | null)?.sinSupervisor);
  const motivoEgresado = (ultima?.datos as DatosSolicitudCarta | null)?.sinSupervisor?.motivo || carta.motivo || "";
  if (!ultima || ultima.estado !== "aprobada") return { estado: "pendiente", motivoEgresado };

  const [v] = await db
    .select({ mensaje: validacionesSinSupervisor.mensaje, por: validacionesSinSupervisor.validadaPor, en: validacionesSinSupervisor.validadaEn })
    .from(validacionesSinSupervisor)
    .where(eq(validacionesSinSupervisor.solicitudId, ultima.id));
  const porId = v?.por ?? ultima.revisadoPor;
  const [quien] = porId ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, porId)) : [];
  const en = v?.en ?? ultima.revisadoEn;
  return {
    estado: "validada",
    motivoEgresado,
    mensaje: v?.mensaje ?? null,
    validadaPor: quien?.nombre ?? null,
    validadaEn: en ? en.toISOString() : null,
  };
}
