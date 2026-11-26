// Valoraciones del cierre de un proceso (entrega V5), para el expediente que ven el administrador y el coordinador:
// la del asesor a cada egresado, la de cada egresado al asesor y las de ambos a la empresa.

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas, usuarios, valoraciones } from "@/lib/schema";
import { ASPECTOS, formatoNota, tipoDe, type EvaluadorRol, type Objetivo } from "@/lib/valoraciones";
import Nota from "./Nota";

const TITULO: Record<string, string> = {
  asesor_egresado: "El asesor valoró al egresado",
  egresado_asesor: "El egresado valoró al asesor",
  egresado_empresa: "El egresado valoró a la empresa",
  asesor_empresa: "El asesor valoró a la empresa",
};
const ORDEN = ["asesor_egresado", "egresado_asesor", "egresado_empresa", "asesor_empresa"];

export default async function ValoracionesDelProceso({ propuestaId }: { propuestaId: number }) {
  let filas: (typeof valoraciones.$inferSelect)[] = [];
  try {
    filas = await db.select().from(valoraciones).where(eq(valoraciones.propuestaId, propuestaId));
  } catch {
    return null; // la tabla todavía no existe en esta base
  }

  const idsUsuarios = [...new Set(filas.flatMap((f) => [f.evaluadorId, ...(f.objetivo !== "empresa" ? [f.evaluadoId] : [])]))];
  const idsEmpresas = [...new Set(filas.filter((f) => f.objetivo === "empresa").map((f) => f.evaluadoId))];
  const [gente, emps] = await Promise.all([
    idsUsuarios.length ? db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, idsUsuarios)) : Promise.resolve([]),
    idsEmpresas.length ? db.select({ id: empresas.id, nombre: empresas.nombre }).from(empresas).where(inArray(empresas.id, idsEmpresas)) : Promise.resolve([]),
  ]);
  const persona = (id: number) => gente.find((g) => g.id === id)?.nombre ?? "Usuario";
  const evaluado = (objetivo: string, id: number) => (objetivo === "empresa" ? emps.find((e) => e.id === id)?.nombre ?? "Empresa" : persona(id));

  const ordenadas = filas
    .map((f) => ({ ...f, tipo: tipoDe(f.evaluadorRol as EvaluadorRol, f.objetivo as Objetivo) }))
    .sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo));

  return (
    <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <header className="px-5 py-3 border-b border-border bg-gray-50">
        <h2 className="font-bold text-card-dark">Valoraciones del cierre</h2>
        <p className="text-xs text-muted">Escala de 1 a 10. Solo las ven la administración y la coordinación.</p>
      </header>
      <div className="p-5">
        {ordenadas.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay valoraciones. Se piden al egresado y al asesor cuando se aprueba el informe final.</p>
        ) : (
          <ul className="space-y-4">
            {ordenadas.map((v) => {
              const puntajes = v.puntajes as Record<string, number>;
              return (
                <li key={v.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{TITULO[v.tipo]}</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {persona(v.evaluadorId)} <span className="text-muted font-normal">a</span> {evaluado(v.objetivo, v.evaluadoId)}
                      </p>
                    </div>
                    <Nota valor={Number(v.promedio)} />
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-3">
                    {ASPECTOS[v.tipo].map((a) => (
                      <li key={a.clave} className="flex justify-between text-xs">
                        <span className="text-gray-600">{a.nombre}</span>
                        <span className="font-bold text-gray-800">{formatoNota(puntajes[a.clave] ?? null)}</span>
                      </li>
                    ))}
                  </ul>
                  {v.comentario && <p className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg p-3 mt-3 whitespace-pre-line">{v.comentario}</p>}
                  <p className="text-[11px] text-muted mt-2">{v.creadoEn.toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" })}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
