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

  const [fila] = await db
    .select({ ficha: fichas, facultad: facultades.nombre, carrera: carreras.nombre })
    .from(fichas)
    .leftJoin(facultades, eq(fichas.facultadId, facultades.id))
    .leftJoin(carreras, eq(fichas.carreraId, carreras.id))
    .where(eq(fichas.id, id));
  if (!fila) notFound();
  const { ficha } = fila;

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

  // Referencia para "Cambios": la versión de la que se copió.
  let referencia: { etiqueta: string; definicion: DefinicionFicha } | null = null;
  if (actual.basadaEnId) {
    const [origen] = await db
      .select({ numero: fichasVersiones.numero, definicion: fichasVersiones.definicion, codigo: fichas.codigo, nombre: fichas.nombre })
      .from(fichasVersiones)
      .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
      .where(eq(fichasVersiones.id, actual.basadaEnId));
    if (origen) referencia = { etiqueta: `${origen.codigo ?? origen.nombre}, versión ${origen.numero}`, definicion: origen.definicion as DefinicionFicha };
  }

  return (
    <EditorFicha
      key={actual.id}
      ficha={{
        id: ficha.id,
        codigo: ficha.codigo,
        nombre: ficha.nombre,
        modalidad: ficha.modalidad as Modalidad,
        esBase: ficha.esBase,
        alcance: fila.carrera ? `${fila.carrera} · ${fila.facultad}` : fila.facultad ? `${fila.facultad} · todas las carreras` : "Todas las facultades",
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
    />
  );
}
