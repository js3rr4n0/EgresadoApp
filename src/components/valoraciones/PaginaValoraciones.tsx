import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { misValoraciones, procesosParaValorar } from "@/lib/valoracionesServidor";
import { tipoDe, type EvaluadorRol } from "@/lib/valoraciones";
import FormularioValoracion from "./FormularioValoracion";

const NOMBRE_TIPO: Record<string, string> = { pasantia: "Pasantía", proyecto: "Proyecto", investigacion: "Investigación" };

/** Página de valoraciones de un proceso cerrado (entrega V3), compartida por el egresado y el asesor. */
export default async function PaginaValoraciones({ rol, propuestaId }: { rol: EvaluadorRol; propuestaId: number }) {
  const session = await getSession();
  if (!session || session.rol !== rol) redirect("/login");
  if (!Number.isInteger(propuestaId)) notFound();

  const [proceso] = await procesosParaValorar(session.userId, rol, propuestaId);
  if (!proceso) notFound();
  const enviadas = await misValoraciones(session.userId, propuestaId);
  const pendientes = proceso.objetivos.filter((o) => !o.hecha).length;

  const subtitulo = (objetivo: string, nombre: string) =>
    objetivo === "empresa"
      ? `Empresa donde se realizó el trabajo: ${nombre}`
      : objetivo === "asesor"
        ? `Asesor responsable: ${nombre}`
        : `Egresado: ${nombre}`;
  const titulo = (objetivo: string) =>
    objetivo === "empresa" ? "Valoración de la empresa" : objetivo === "asesor" ? "Valoración del asesor" : "Valoración del egresado";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/${rol}`} className="text-sm font-semibold text-muted hover:text-brand-red transition-colors">
          Volver al inicio
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-3">Valoraciones del proceso</h1>
        <p className="text-sm text-muted mt-1">
          {NOMBRE_TIPO[proceso.tipo] ?? proceso.tipo} · {proceso.cohorte} · {proceso.titulo}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 text-sm text-gray-700 shadow-sm">
        {pendientes > 0 ? (
          <>
            El proceso terminó. Califica cada aspecto de 1 a 10, donde 1 es muy deficiente y 10 excelente. Te toma unos
            minutos y ayuda a la universidad a elegir mejor las empresas{rol === "egresado" ? " y a mejorar el acompañamiento de los asesores" : ""}.
            {rol === "egresado" ? " El asesor y la empresa no ven tus respuestas individuales." : " El egresado y la empresa no ven tus respuestas individuales."}
          </>
        ) : (
          <>Ya enviaste todas las valoraciones de este proceso. Gracias.</>
        )}
      </div>

      {proceso.objetivos.map((o) => {
        const hecha = enviadas.find((v) => v.objetivo === o.objetivo && v.evaluadoId === o.evaluadoId);
        return (
          <FormularioValoracion
            key={`${o.objetivo}-${o.evaluadoId}`}
            propuestaId={propuestaId}
            tipo={tipoDe(rol, o.objetivo)}
            objetivo={o.objetivo}
            evaluadoId={o.evaluadoId}
            titulo={titulo(o.objetivo)}
            subtitulo={subtitulo(o.objetivo, o.nombre)}
            enviada={hecha ? { puntajes: hecha.puntajes as Record<string, number>, comentario: hecha.comentario, promedio: Number(hecha.promedio) } : null}
          />
        );
      })}
    </div>
  );
}
