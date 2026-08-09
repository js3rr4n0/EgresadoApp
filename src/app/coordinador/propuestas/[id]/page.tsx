import { getDetallePropuestaCoordinador } from "@/app/actions/coordinador";
import Link from "next/link";
import CoordinadorProgresoClient from "./CoordinadorProgresoClient";

export default async function CoordinadorPropuestaProgresoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const pId = parseInt(p.id, 10);
  if (isNaN(pId)) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">ID de Propuesta Inválido</h2>
        <p className="text-xs text-slate-500">La propuesta solicitada no existe o el identificador es incorrecto.</p>
        <Link
          href="/coordinador"
          className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          Volver a Mis Propuestas
        </Link>
      </div>
    );
  }

  const res = await getDetallePropuestaCoordinador(pId);
  if (!res || !res.success || !res.data) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">No se pudo cargar la propuesta #{pId}</h2>
        <p className="text-xs text-slate-500">
          {res?.error || "Es posible que la propuesta no exista o requiera permisos de coordinador."}
        </p>
        <Link
          href="/coordinador"
          className="inline-block bg-brand-red text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          Volver al Panel de Coordinador
        </Link>
      </div>
    );
  }

  return <CoordinadorProgresoClient data={res.data as any} />;
}
