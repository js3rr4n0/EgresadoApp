import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { leerConfiguracionCohorte } from "@/lib/configCohorteServidor";
import { cohorteIniciada } from "@/lib/configCohorte";
import { isoDia } from "@/lib/seguimientoCohortes";
import ConfiguracionCohorte from "@/components/configCohorte/ConfiguracionCohorte";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuración de la cohorte | Admin" };

/** Configuración de la cohorte por facultad (specs/CONFIGURACION_COHORTE.md, entrega C1). Solo superadministrador. */
export default async function ConfiguracionCohortePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const datos = await leerConfiguracionCohorte(id);
  if (!datos) notFound();
  return <ConfiguracionCohorte datos={datos} iniciada={cohorteIniciada(datos.periodo.inicioRecepcion, isoDia(new Date()))} />;
}
