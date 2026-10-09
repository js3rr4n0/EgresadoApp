import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getSemanaRevision } from "@/app/actions/registrosActividad";
import RevisionSemanaClient from "./RevisionSemanaClient";

export default async function RevisionSemanaPage({
  params,
  searchParams,
}: {
  params: Promise<{ propuestaId: string; periodo: string; semana: string }>;
  searchParams: Promise<{ actividad?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const p = await params;
  const propuestaId = Number(p.propuestaId);
  const periodo = Number(p.periodo);
  const semana = Number(p.semana);
  if (![propuestaId, periodo, semana].every(Number.isFinite)) notFound();

  const res = await getSemanaRevision(propuestaId, periodo, semana);
  if (!res.success) {
    return <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>;
  }

  const actividadInicial = Number((await searchParams).actividad) || undefined;
  return <RevisionSemanaClient key={`${periodo}.${semana}`} data={res} actividadInicial={actividadInicial} />;
}
