import { db } from "@/lib/db";
import { solicitudesEmpresa, empresas, propuestas, usuarios } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import SolicitudesTable from "./SolicitudesTable";

export default async function SolicitudesEmpresaPage() {
  const solicitudes = await db
    .select({
      id: solicitudesEmpresa.id,
      tipo: solicitudesEmpresa.tipo,
      estado: solicitudesEmpresa.estado,
      datos: solicitudesEmpresa.datos,
      creadaEn: solicitudesEmpresa.creadaEn,
      empresaTarget: empresas.nombre,
      egresado: usuarios.nombreCompleto,
    })
    .from(solicitudesEmpresa)
    .leftJoin(empresas, eq(solicitudesEmpresa.empresaId, empresas.id))
    .leftJoin(propuestas, eq(solicitudesEmpresa.propuestaId, propuestas.id))
    .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
    .orderBy(desc(solicitudesEmpresa.creadaEn));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Solicitudes de Empresa</h1>
        <p className="text-muted mt-1 text-sm">
          Revisa y aprueba nuevas empresas o actualizaciones de datos enviadas por los egresados.
        </p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm p-1">
        <SolicitudesTable solicitudes={solicitudes} />
      </div>
    </div>
  );
}
