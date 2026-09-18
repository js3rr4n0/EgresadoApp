import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getInformeMensualDetalle } from "@/app/actions/informesMensuales";
import InformeMensualClient from "./InformeMensualClient";

export default async function InformeMensualDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  const { id } = await params;
  const informeId = Number(id);
  if (!Number.isFinite(informeId)) notFound();

  const res = await getInformeMensualDetalle(informeId);
  if (!res.success || !res.informe) {
    return (
      <div className="p-5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el informe mensual."}
      </div>
    );
  }

  if (res.rol !== "egresado") {
    redirect("/login");
  }

  return <InformeMensualClient data={res as any} />;
}
