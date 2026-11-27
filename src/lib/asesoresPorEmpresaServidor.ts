import "server-only";
// D7 (specs/COORDINADOR_ASIGNACION.md): empresas con propuestas de las carreras de quien consulta, sus datos, cuántos
// procesos tienen y qué asesores trabajan con ellas. Solo lectura: el catálogo lo edita el superadministrador.

import { and, asc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas, firmantes, periodos, propuestas, sucursales, supervisores, usuarios } from "@/lib/schema";
import { alcanceCoordinacion } from "@/lib/alcanceCoordinacionServidor";

const EN_CURSO = ["aprobada", "primer_contacto_completado", "en_ejecucion"];
const EN_ESPERA = ["enviada", "coordinador_asignado"];

export interface AsesorEmpresa {
  id: number;
  nombre: string;
  correo: string;
  enCurso: number;
  total: number;
}

export interface EmpresaCoordinacion {
  id: number;
  nombre: string;
  area: string | null;
  direccion: string | null;
  sucursales: number;
  habilitada: boolean;
  verificada: boolean;
  contacto: { nombre: string; cargo: string | null; correo: string | null; telefono: string | null; papel: "Firmante" | "Supervisor" } | null;
  propuestas: { total: number; enCurso: number; enEspera: number };
  cohortes: string[];
  asesores: AsesorEmpresa[];
}

export interface DatosAsesoresEmpresa {
  cohortes: { id: number; nombre: string }[];
  /** null = todas las cohortes. */
  cohorte: { id: number; nombre: string } | null;
  sinConfiguracion: boolean;
  empresas: EmpresaCoordinacion[];
}

/** `periodo`: id de la cohorte, o "todas". Las carreras salen de la cohorte elegida (o de la más reciente). */
export async function asesoresPorEmpresa(usuario: { id: number; rol: string }, periodo: number | "todas" | undefined): Promise<DatosAsesoresEmpresa> {
  const alc = await alcanceCoordinacion(usuario, typeof periodo === "number" ? periodo : undefined);
  const todas = periodo === "todas";
  const base: DatosAsesoresEmpresa = { cohortes: alc.cohortes, cohorte: todas ? null : alc.cohorte, sinConfiguracion: alc.sinConfiguracion, empresas: [] };
  if (!alc.carreras.size) return base;

  const filas = await db
    .select({
      id: propuestas.id,
      empresaId: propuestas.empresaId,
      asesorId: propuestas.asesorId,
      estado: propuestas.estado,
      cohorte: periodos.nombre,
      periodoId: propuestas.periodoId,
    })
    .from(propuestas)
    .innerJoin(usuarios, eq(usuarios.id, propuestas.egresadoId))
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .where(
      and(
        isNotNull(propuestas.empresaId),
        ne(propuestas.estado, "anulada"),
        inArray(usuarios.carreraId, [...alc.carreras]),
        todas || !alc.cohorte ? undefined : eq(propuestas.periodoId, alc.cohorte.id),
      ),
    );
  // Solo cuentan las que ya salieron del egresado (enviadas en adelante)
  const validas = filas.filter((f) => [...EN_CURSO, ...EN_ESPERA].includes(f.estado));
  const idsEmpresa = [...new Set(validas.map((f) => f.empresaId!))];
  if (!idsEmpresa.length) return base;
  const idsAsesor = [...new Set(validas.map((f) => f.asesorId).filter((x): x is number => x != null))];

  const [emps, sucs, firms, sups, ases] = await Promise.all([
    db.select().from(empresas).where(inArray(empresas.id, idsEmpresa)),
    db.select({ id: sucursales.id, empresaId: sucursales.empresaId }).from(sucursales).where(inArray(sucursales.empresaId, idsEmpresa)),
    db.select().from(firmantes).where(inArray(firmantes.empresaId, idsEmpresa)).orderBy(asc(firmantes.id)),
    db.select().from(supervisores).where(inArray(supervisores.empresaId, idsEmpresa)).orderBy(asc(supervisores.id)),
    idsAsesor.length ? db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto, correo: usuarios.correo }).from(usuarios).where(inArray(usuarios.id, idsAsesor)) : Promise.resolve([]),
  ]);

  const nombrePersona = (p: { titulo: string | null; nombres: string; apellidos: string }) => [p.titulo, p.nombres, p.apellidos].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const empresasLista: EmpresaCoordinacion[] = emps.map((e) => {
    const deE = validas.filter((f) => f.empresaId === e.id);
    // Contacto principal: el primer firmante de la sede principal; si no hay, el primer supervisor
    const firm = firms.filter((x) => x.empresaId === e.id).sort((a, b) => Number(a.sucursalId != null) - Number(b.sucursalId != null))[0];
    const sup = sups.filter((x) => x.empresaId === e.id).sort((a, b) => Number(a.sucursalId != null) - Number(b.sucursalId != null))[0];
    const persona = firm ?? sup;
    const asesores = idsAsesor
      .map((id) => {
        const suyas = deE.filter((f) => f.asesorId === id);
        const u = ases.find((a) => a.id === id);
        return { id, nombre: u?.nombre ?? `Asesor ${id}`, correo: u?.correo ?? "", enCurso: suyas.filter((f) => EN_CURSO.includes(f.estado)).length, total: suyas.length };
      })
      .filter((a) => a.total > 0)
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
    return {
      id: e.id,
      nombre: e.nombre,
      area: e.area,
      direccion: e.direccion,
      sucursales: sucs.filter((s) => s.empresaId === e.id).length,
      habilitada: e.habilitada,
      verificada: e.verificada,
      contacto: persona ? { nombre: nombrePersona(persona), cargo: persona.cargo, correo: persona.correo, telefono: persona.telefono, papel: firm ? "Firmante" : "Supervisor" } : null,
      propuestas: {
        total: deE.length,
        enCurso: deE.filter((f) => EN_CURSO.includes(f.estado)).length,
        enEspera: deE.filter((f) => EN_ESPERA.includes(f.estado)).length,
      },
      cohortes: [...new Set(deE.map((f) => f.cohorte))],
      asesores,
    };
  });
  empresasLista.sort((a, b) => b.propuestas.total - a.propuestas.total || a.nombre.localeCompare(b.nombre, "es"));
  return { ...base, empresas: empresasLista };
}
