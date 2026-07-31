import { db } from "@/lib/db";
import { propuestas, usuarios, carreras } from "@/lib/schema";
import { eq, desc, isNotNull } from "drizzle-orm";
import PropuestasTable from "./PropuestasTable";

import { getCoordinadoresConEstadisticas } from "@/app/actions/adminPropuestas";

export const dynamic = "force-dynamic";

export default async function AdminPropuestasPage() {
  // Get all proposals that have been sent at least once
  const list = await db.select({
    id: propuestas.id,
    estado: propuestas.estado,
    enviadaEn: propuestas.enviadaEn,
    tipo: propuestas.tipo,
    titulo: propuestas.titulo,
    numero: propuestas.numero,
    estudiante: usuarios.nombreCompleto,
    carnet: usuarios.carnet,
    carrera: carreras.nombre
  })
  .from(propuestas)
  .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
  .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
  .where(isNotNull(propuestas.enviadaEn))
  .orderBy(desc(propuestas.enviadaEn));

  const coordRes = await getCoordinadoresConEstadisticas();
  const coordinadores = coordRes.success ? coordRes.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-card-dark tracking-tight">
          Gestión de Propuestas
        </h1>
        <p className="text-muted mt-2">
          Revisa y asigna las propuestas a los coordinadores de facultad correspondientes.
        </p>
      </div>

      <PropuestasTable data={list} coordinadores={coordinadores} />
    </div>
  );
}
