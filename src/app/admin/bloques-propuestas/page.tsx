import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { carreras, facultades, fichas, fichasVersiones } from "@/lib/schema";
import PanelFichas, { type FilaFicha } from "@/components/fichas/PanelFichas";
import type { EstadoVersion, Modalidad } from "@/lib/fichas/tipos";

export const metadata = {
  title: "Fichas de trabajos de graduación | Gestión TG UNICAES",
};

export default async function FichasPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");

  const [listaFichas, versiones, listaFacultades, listaCarreras] = await Promise.all([
    db.select().from(fichas).orderBy(asc(fichas.esBase), asc(fichas.codigo)),
    db
      .select({
        id: fichasVersiones.id,
        fichaId: fichasVersiones.fichaId,
        numero: fichasVersiones.numero,
        estado: fichasVersiones.estado,
        actualizadaEn: fichasVersiones.actualizadaEn,
      })
      .from(fichasVersiones)
      .orderBy(asc(fichasVersiones.numero)),
    db.select({ id: facultades.id, nombre: facultades.nombre, codigo: facultades.codigo }).from(facultades).orderBy(asc(facultades.nombre)),
    db
      .select({ id: carreras.id, nombre: carreras.nombre, codigo: carreras.codigo, facultadId: carreras.facultadId })
      .from(carreras)
      .orderBy(asc(carreras.nombre)),
  ]);

  const nombreFacultad = new Map(listaFacultades.map((f) => [f.id, f.nombre]));
  const nombreCarrera = new Map(listaCarreras.map((c) => [c.id, c.nombre]));

  // Fichas propias primero y las base al final (son la referencia, no se editan).
  const filas: FilaFicha[] = listaFichas.map((f) => {
    const propias = versiones.filter((v) => v.fichaId === f.id);
    const habilitadas = propias.filter((v) => v.estado === "habilitada");
    const ultima = propias[propias.length - 1];
    return {
      id: f.id,
      codigo: f.codigo,
      nombre: f.nombre,
      modalidad: f.modalidad as Modalidad,
      esBase: f.esBase,
      facultadId: f.facultadId,
      carreraId: f.carreraId,
      alcance: f.carreraId
        ? `${nombreCarrera.get(f.carreraId)} · ${nombreFacultad.get(f.facultadId ?? 0) ?? ""}`
        : f.facultadId
          ? `${nombreFacultad.get(f.facultadId)} · todas las carreras`
          : "Todas las facultades",
      vigente: habilitadas[habilitadas.length - 1]?.numero ?? null,
      borrador: propias.find((v) => v.estado === "borrador")?.numero ?? null,
      versiones: propias.map((v) => ({ id: v.id, numero: v.numero, estado: v.estado as EstadoVersion })),
      actualizada: (ultima?.actualizadaEn ?? f.actualizadaEn).toISOString(),
    };
  });

  return <PanelFichas filas={filas} facultades={listaFacultades} carreras={listaCarreras} />;
}
