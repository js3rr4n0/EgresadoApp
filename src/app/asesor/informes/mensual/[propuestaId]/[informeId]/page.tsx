import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformeMensualDetalle } from "@/app/actions/informesMensuales";
import RevisionInformeMensualClient from "./RevisionInformeMensualClient";

export default async function RevisionInformeMensualPage({
  params,
}: {
  params: Promise<{ propuestaId: string; informeId: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "asesor") {
    redirect("/login");
  }

  const { informeId } = await params;
  const id = Number(informeId);
  if (!Number.isFinite(id)) notFound();

  const res = await getInformeMensualDetalle(id);
  if (!res.success || !res.informe) {
    return (
      <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el informe mensual."}
      </div>
    );
  }

  if (res.rol !== "asesor") {
    redirect("/login");
  }

  return <RevisionInformeMensualClient data={res as any} />;
}
