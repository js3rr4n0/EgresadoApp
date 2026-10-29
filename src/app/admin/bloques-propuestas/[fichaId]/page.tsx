import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { carreras, facultades, fichas, fichasVersiones } from "@/lib/schema";
import EditorFicha from "@/components/fichas/EditorFicha";
import type { DefinicionFicha, EstadoVersion, Modalidad } from "@/lib/fichas/tipos";

export const metadata = {
  title: "Ficha de trabajo de graduación | Gestión TG UNICAES",
};

export default async function FichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ fichaId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");

  const { fichaId } = await params;
  const { v } = await searchParams;
  const id = Number(fichaId);
  if (!Number.isInteger(id)) notFound();

  const [ficha] = await db.select().from(fichas).where(eq(fichas.id, id));
  if (!ficha) notFound();

  const versiones = await db
    .select()
    .from(fichasVersiones)
    .where(eq(fichasVersiones.fichaId, id))
    .orderBy(asc(fichasVersiones.numero));
  if (versiones.length === 0) notFound();

  // Versión que se muestra: la pedida, o el borrador, o la última habilitada, o la última.
  const pedida = v ? versiones.find((x) => x.id === Number(v)) : undefined;
  const habilitadas = versiones.filter((x) => x.estado === "habilitada");
  const actual =
    pedida ?? versiones.find((x) => x.estado === "borrador") ?? habilitadas[habilitadas.length - 1] ?? versiones[versiones.length - 1];

  // Referencia para "Cambios": la versión de la que se copió; si no hay, la habilitada anterior.
  let referencia: { etiqueta: string; definicion: DefinicionFicha } | null = null;
  if (actual.basadaEnId) {
    const [origen] = await db
      .select({ numero: fichasVersiones.numero, definicion: fichasVersiones.definicion, nombre: fichas.nombre })
      .from(fichasVersiones)
      .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
      .where(eq(fichasVersiones.id, actual.basadaEnId));
    if (origen) referencia = { etiqueta: `${origen.nombre}, versión ${origen.numero}`, definicion: origen.definicion as DefinicionFicha };
  }

  const [listaFacultades, listaCarreras] = await Promise.all([
    db.select({ id: facultades.id, nombre: facultades.nombre }).from(facultades).orderBy(asc(facultades.nombre)),
    db.select({ id: carreras.id, nombre: carreras.nombre, facultadId: carreras.facultadId }).from(carreras).orderBy(asc(carreras.nombre)),
  ]);

  return (
    <EditorFicha
      key={actual.id}
      ficha={{
        id: ficha.id,
        nombre: ficha.nombre,
        modalidad: ficha.modalidad as Modalidad,
        esBase: ficha.esBase,
        facultadId: ficha.facultadId,
        carreraId: ficha.carreraId,
      }}
      versiones={versiones.map((x) => ({
        id: x.id,
        numero: x.numero,
        estado: x.estado as EstadoVersion,
        habilitadaEn: x.habilitadaEn?.toISOString() ?? null,
        notas: x.notas,
      }))}
      version={{
        id: actual.id,
        numero: actual.numero,
        estado: actual.estado as EstadoVersion,
        definicion: actual.definicion as DefinicionFicha,
      }}
      referencia={referencia}
      facultades={listaFacultades}
      carreras={listaCarreras}
    />
  );
}
