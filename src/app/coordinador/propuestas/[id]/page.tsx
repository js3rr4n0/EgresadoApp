import { getDetallePropuestaCoordinador, getAsesoresFacultad } from "@/app/actions/coordinador";
import Link from "next/link";
import CoordinadorProgresoClient from "./CoordinadorProgresoClient";
import ValoracionesDelProceso from "@/components/valoraciones/ValoracionesDelProceso";
import FortalezaResumen from "@/components/fortaleza/FortalezaResumen";
import ListaRequisitos from "@/components/revisarPropuesta/ListaRequisitos";
import { requisitosAsignacion } from "@/lib/requisitosAsignacionServidor";
import ConstanciaSinSupervisor from "@/components/revisarPropuesta/ConstanciaSinSupervisor";
import RevisarAsignar from "@/components/coordinador/RevisarAsignar";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";

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

  // D4: mientras no tiene asesor, la vista única «Revisar y asignar» (solo el coordinador asignado o la administración)
  const session = await getSession();
  if (!session || !["coordinador", "admin", "decanato"].includes(session.rol)) redirect("/login");
  const [base] = await db
    .select({ estado: propuestas.estado, asesorId: propuestas.asesorId, coordinadorId: propuestas.coordinadorId })
    .from(propuestas)
    .where(eq(propuestas.id, pId));
  if (base && !base.asesorId && ["enviada", "coordinador_asignado"].includes(base.estado)) {
    if (session.rol === "coordinador" && base.coordinadorId !== session.userId) redirect("/coordinador");
    return <RevisarAsignar propuestaId={pId} />;
  }

  const [res, asesoresRes] = await Promise.all([
    getDetallePropuestaCoordinador(pId),
    getAsesoresFacultad(pId),
  ]);

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

  const asesores = asesoresRes?.success && Array.isArray(asesoresRes.data) ? asesoresRes.data : [];
  // D1: mientras no tiene asesor, lo que el sistema y la administración verificaron
  const datosProp = (res.data as { propuesta?: { estado?: string; asesorId?: number | null } }).propuesta ?? {};
  const requisitos = !datosProp.asesorId && ["enviada", "coordinador_asignado"].includes(datosProp.estado ?? "")
    ? await requisitosAsignacion(pId).catch(() => null)
    : null;

  return (
    <div className="space-y-6">
      {/* R3: fortaleza de la propuesta */}
      {requisitos && (
        <section className={`rounded-xl border shadow-sm overflow-hidden ${requisitos.listo ? "border-border bg-white" : "border-red-200 bg-white"}`}>
          <header className="px-5 py-3 border-b border-border bg-gray-50">
            <h2 className="font-bold text-card-dark">Verificado antes de asignar</h2>
            <p className="text-xs text-muted">
              {requisitos.listo
                ? "El sistema y la administración ya revisaron estos puntos. Revisa el documento de la propuesta y asigna el asesor."
                : "Falta algo que debía verificarse antes de llegar a coordinación: no se puede asignar asesor. Recházala por requisitos o pide a la administración que lo revise."}
            </p>
          </header>
          <div className="px-5 py-4">
            <ListaRequisitos requisitos={requisitos.requisitos} />
          </div>
        </section>
      )}
      {/* D2: constancia si trabaja sin supervisor empresarial */}
      <ConstanciaSinSupervisor propuestaId={pId} />
      <FortalezaResumen propuestaId={pId} paraAsesor />
      <CoordinadorProgresoClient data={{ ...(res.data as any), asesores, bloqueoRequisitos: !!requisitos && !requisitos.listo }} />
      {/* Valoraciones al cierre del proceso (entrega V5) */}
      <ValoracionesDelProceso propuestaId={pId} />
    </div>
  );
}
