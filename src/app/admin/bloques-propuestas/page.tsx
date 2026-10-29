import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { carreras, facultades, fichas, fichasVersiones } from "@/lib/schema";
import NuevaFichaModal from "@/components/fichas/NuevaFichaModal";
import { ETIQUETA_MODALIDAD, EstadoVersionBadge } from "@/components/fichas/comunes";
import type { EstadoVersion, Modalidad } from "@/lib/fichas/tipos";

export const metadata = {
  title: "Fichas de trabajos de graduación | Gestión TG UNICAES",
};

export default async function FichasPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");

  const [listaFichas, versiones, listaFacultades, listaCarreras] = await Promise.all([
    db.select().from(fichas).orderBy(asc(fichas.id)),
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
    db.select({ id: facultades.id, nombre: facultades.nombre }).from(facultades).orderBy(asc(facultades.nombre)),
    db.select({ id: carreras.id, nombre: carreras.nombre, facultadId: carreras.facultadId }).from(carreras).orderBy(asc(carreras.nombre)),
  ]);

  const nombreFacultad = new Map(listaFacultades.map((f) => [f.id, f.nombre]));
  const nombreCarrera = new Map(listaCarreras.map((c) => [c.id, c.nombre]));

  const filas = listaFichas.map((f) => {
    const propias = versiones.filter((v) => v.fichaId === f.id);
    const habilitadas = propias.filter((v) => v.estado === "habilitada");
    const borrador = propias.find((v) => v.estado === "borrador");
    const ultima = propias[propias.length - 1];
    return {
      ...f,
      versiones: propias,
      vigente: habilitadas[habilitadas.length - 1] ?? null,
      borrador: borrador ?? null,
      actualizada: ultima?.actualizadaEn ?? f.actualizadaEn,
    };
  });

  // Versiones que se pueden usar como punto de partida de una ficha nueva (las que no son borradores).
  const origenes = filas.flatMap((f) =>
    f.versiones
      .filter((v) => v.estado !== "borrador")
      .map((v) => ({ versionId: v.id, modalidad: f.modalidad as Modalidad, etiqueta: `${f.nombre} — versión ${v.numero}`, esBase: f.esBase }))
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fichas de trabajos de graduación</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Cada ficha define cómo se realiza un tipo de trabajo: los espacios de la propuesta y las reglas de su ejecución.
            Las fichas base describen el funcionamiento actual del sistema y sirven como punto de partida.
          </p>
        </div>
        <NuevaFichaModal origenes={origenes} facultades={listaFacultades} carreras={listaCarreras} />
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
        <strong>Vista previa del constructor.</strong> Los egresados todavía usan el asistente actual: las fichas que se creen o
        habiliten aquí no cambian su proceso hasta que se conecten (entrega 4 del módulo).
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-bold px-4 py-3">Ficha</th>
              <th className="text-left font-bold px-4 py-3">Modalidad</th>
              <th className="text-left font-bold px-4 py-3">Alcance</th>
              <th className="text-left font-bold px-4 py-3">Versiones</th>
              <th className="text-left font-bold px-4 py-3">Actualizada</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-800">{f.nombre}</div>
                  {f.esBase && <div className="text-xs text-gray-500">Ficha base · solo lectura</div>}
                </td>
                <td className="px-4 py-3 text-gray-700">{ETIQUETA_MODALIDAD[f.modalidad as Modalidad]}</td>
                <td className="px-4 py-3 text-gray-700">
                  {f.carreraId ? nombreCarrera.get(f.carreraId) : f.facultadId ? nombreFacultad.get(f.facultadId) : "Todas las facultades"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {f.vigente && <EstadoVersionBadge estado="habilitada" texto={`v${f.vigente.numero} habilitada`} />}
                    {f.borrador && <EstadoVersionBadge estado="borrador" texto={`v${f.borrador.numero} borrador`} />}
                    {!f.vigente && !f.borrador && f.versiones.length > 0 && (
                      <EstadoVersionBadge estado={f.versiones[f.versiones.length - 1].estado as EstadoVersion} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(f.actualizada).toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/bloques-propuestas/${f.id}`}
                    className="inline-flex items-center gap-1 text-brand-red font-bold hover:underline whitespace-nowrap"
                  >
                    {f.borrador && !f.esBase ? "Editar" : "Abrir"}
                  </Link>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No hay fichas. Ejecuta scripts/fichas/sembrar_fichas_base.ts para crear las fichas base.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
