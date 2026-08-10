import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  carreras,
  integrantesProyecto,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import DictamenPropuestaClient from "./DictamenPropuestaClient";

export default async function DictamenPropuestaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tipo?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const tipoDictamen = sp.tipo === "propuesta" ? "propuesta" : "plan";
  const propuestaId = parseInt(id, 10);

  const [propRow] = await db
    .select({
      propuesta: propuestas,
      estudiante: usuarios,
      carreraNombre: carreras.nombre,
    })
    .from(propuestas)
    .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(eq(propuestas.id, propuestaId))
    .limit(1);

  if (!propRow || !propRow.propuesta) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Propuesta no encontrada.
      </div>
    );
  }

  const prop = propRow.propuesta;

  // Fetch student team if multi-student
  let teamMembers: any[] = [];
  if (prop.tipo === "proyecto" || prop.tipo === "investigacion") {
    teamMembers = await db
      .select({
        id: usuarios.id,
        carnet: usuarios.carnet,
        nombreCompleto: usuarios.nombreCompleto,
        cohorte: usuarios.cohorte,
      })
      .from(integrantesProyecto)
      .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
      .where(
        and(
          eq(integrantesProyecto.propuestaId, propuestaId),
          eq(integrantesProyecto.estado, "aceptado")
        )
      );
  }

  // Fetch Advisor name
  let asesorNombre = "";
  if (prop.asesorId) {
    const [ase] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, prop.asesorId))
      .limit(1);
    if (ase) asesorNombre = ase.nombreCompleto;
  }

  // Fetch Decano name if available
  let decanoNombre = "";
  if (propRow.estudiante?.facultadId) {
    const [dec] = await db
      .select()
      .from(usuarios)
      .where(
        and(
          eq(usuarios.facultadId, propRow.estudiante.facultadId),
          eq(usuarios.rol, "decanato"),
          eq(usuarios.activo, true)
        )
      )
      .limit(1);
    if (dec) decanoNombre = dec.nombreCompleto;
  }

  const studentsList = [
    {
      carnet: propRow.estudiante?.carnet || "",
      nombreCompleto: propRow.estudiante?.nombreCompleto || "",
      carrera: propRow.carreraNombre || "",
      cohorte: propRow.estudiante?.cohorte || "",
    },
    ...teamMembers.map((tm) => ({
      carnet: tm.carnet || "",
      nombreCompleto: tm.nombreCompleto || "",
      carrera: propRow.carreraNombre || "",
      cohorte: tm.cohorte || "",
    })),
  ];

  return (
    <DictamenPropuestaClient
      propuesta={prop}
      students={studentsList}
      asesorNombre={asesorNombre}
      decanoNombre={decanoNombre}
      tipoDictamen={tipoDictamen}
    />
  );
}
