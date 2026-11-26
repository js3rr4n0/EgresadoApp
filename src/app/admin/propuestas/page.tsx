import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { propuestas, usuarios, carreras } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import PropuestasTable from "./PropuestasTable";
import { alcanceAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function AdminPropuestasPage() {
  // Superadministrador: todas. Administrador de facultad (C3): las de su facultad (facultad del egresado).
  const alcance = await alcanceAdmin();
  if (!alcance) redirect("/login");

  const list = await db
    .select({
      id: propuestas.id,
      estado: propuestas.estado,
      enviadaEn: propuestas.enviadaEn,
      tipo: propuestas.tipo,
      titulo: propuestas.titulo,
      numero: propuestas.numero,
      estudiante: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      carrera: carreras.nombre,
      empresaId: propuestas.empresaId,
      coordinadorId: propuestas.coordinadorId,
    })
    .from(propuestas)
    .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(alcance.superadmin ? undefined : eq(usuarios.facultadId, alcance.facultadId!))
    .orderBy(desc(propuestas.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-card-dark tracking-tight">
          Gestión de Propuestas
        </h1>
        <p className="text-muted mt-2">
          {alcance.superadmin
            ? "Filtra, revisa, gestiona borradores y asigna las propuestas según la configuración de cada cohorte."
            : `Propuestas de egresados de ${alcance.facultadNombre}.`}
        </p>
      </div>

      <PropuestasTable data={list} />
    </div>
  );
}
