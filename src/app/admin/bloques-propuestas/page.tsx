import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { carreras, facultades, fichas, fichasVersiones, fichasVersionesCohortes, periodos, propuestas } from "@/lib/schema";
import { isNotNull } from "drizzle-orm";
import PanelFichas, { type FilaFicha } from "@/components/fichas/PanelFichas";
import type { EstadoVersion, Modalidad } from "@/lib/fichas/tipos";
import { listarElementosPropios } from "@/app/actions/elementosCatalogo";

export const metadata = {
  title: "Fichas de trabajos de graduación | Gestión TG UNICAES",
};

export default async function FichasPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");

  const [listaFichas, versiones, listaFacultades, listaCarreras, propios, ligas, ciclos, usos] = await Promise.all([
    db.select().from(fichas).orderBy(asc(fichas.esBase), asc(fichas.codigo)),
    db
      .select({
        id: fichasVersiones.id,
        fichaId: fichasVersiones.fichaId,
        numero: fichasVersiones.numero,
        estado: fichasVersiones.estado,
        actualizadaEn: fichasVersiones.actualizadaEn,
        habilitadaEn: fichasVersiones.habilitadaEn,
      })
      .from(fichasVersiones)
      .orderBy(asc(fichasVersiones.numero)),
    db.select({ id: facultades.id, nombre: facultades.nombre, codigo: facultades.codigo }).from(facultades).orderBy(asc(facultades.nombre)),
    db
      .select({ id: carreras.id, nombre: carreras.nombre, codigo: carreras.codigo, facultadId: carreras.facultadId })
      .from(carreras)
      .orderBy(asc(carreras.nombre)),
    listarElementosPropios(),
    // H1: cohortes de cada versión y propuestas que usan cada versión.
    db.select().from(fichasVersionesCohortes),
    db.select({ id: periodos.id, nombre: periodos.nombre }).from(periodos),
    db.select({ versionId: propuestas.fichaVersionId }).from(propuestas).where(isNotNull(propuestas.fichaVersionId)),
  ]);
  const nombreCiclo = new Map(ciclos.map((c) => [c.id, c.nombre]));

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
      // Las versiones con cohortes y la que reciben las demás cohortes (la habilitada más reciente sin cohortes).
      cohortes: habilitadas.length
        ? (() => {
            const con = habilitadas.map((v) => ({ v, nombres: ligas.filter((l) => l.versionId === v.id).map((l) => nombreCiclo.get(l.periodoId) ?? "?") }));
            const general = con.filter((x) => x.nombres.length === 0).sort((a, b) => (b.v.habilitadaEn?.getTime() ?? 0) - (a.v.habilitadaEn?.getTime() ?? 0))[0];
            const partes = con.filter((x) => x.nombres.length).map((x) => `v${x.v.numero}: ${x.nombres.join(", ")}`);
            if (general) partes.push(`v${general.v.numero}: ${partes.length ? "las demás cohortes" : "todas las cohortes"}`);
            return partes.join(" · ");
          })()
        : null,
      procesos: usos.filter((u) => propias.some((v) => v.id === u.versionId)).length,
      borrador: propias.find((v) => v.estado === "borrador")?.numero ?? null,
      versiones: propias.map((v) => ({ id: v.id, numero: v.numero, estado: v.estado as EstadoVersion })),
      actualizada: (ultima?.actualizadaEn ?? f.actualizadaEn).toISOString(),
    };
  });

  return <PanelFichas filas={filas} facultades={listaFacultades} carreras={listaCarreras} propios={propios} />;
}
