import Link from "next/link";
import { valoracionesPendientes } from "@/lib/valoracionesServidor";
import type { EvaluadorRol } from "@/lib/valoraciones";

const NOMBRE_OBJETIVO = { empresa: "la empresa", asesor: "el asesor", egresado: "egresado" } as const;

/** Aviso del panel con las valoraciones pendientes de procesos cerrados (entrega V3). No muestra nada si no hay. */
export default async function AvisoValoraciones({ usuarioId, rol }: { usuarioId: number; rol: EvaluadorRol }) {
  let pendientes: Awaited<ReturnType<typeof valoracionesPendientes>> = [];
  try {
    pendientes = await valoracionesPendientes(usuarioId, rol);
  } catch (e) {
    // Si la tabla aún no existe en esta base, el panel sigue funcionando sin el aviso.
    console.error("No se pudieron leer las valoraciones pendientes:", e);
  }
  if (pendientes.length === 0) return null;

  return (
    <div className="rounded-xl border border-brand-red/30 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-brand-red text-white">
        <p className="font-bold">Valoraciones pendientes</p>
        <p className="text-xs text-white/85">
          {rol === "egresado"
            ? "Tu proceso terminó. Valora a la empresa y a tu asesor: son 4 aspectos de 1 a 10 cada uno."
            : "Estos procesos terminaron. Valora a la empresa y a cada egresado: son 4 aspectos de 1 a 10 cada uno."}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {pendientes.map((p) => {
          const faltan = p.objetivos.filter((o) => !o.hecha);
          const texto =
            rol === "egresado"
              ? faltan.map((o) => NOMBRE_OBJETIVO[o.objetivo]).join(" y ")
              : [
                  ...faltan.filter((o) => o.objetivo === "empresa").map(() => "la empresa"),
                  ...(faltan.some((o) => o.objetivo === "egresado")
                    ? [`${faltan.filter((o) => o.objetivo === "egresado").length === 1 ? "1 egresado" : `${faltan.filter((o) => o.objetivo === "egresado").length} egresados`}`]
                    : []),
                ].join(" y ");
          return (
            <li key={p.propuestaId} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.titulo}</p>
                <p className="text-xs text-muted">
                  {p.cohorte}
                  {p.empresa ? ` · ${p.empresa.nombre}` : ""} · Falta valorar a {texto}
                </p>
              </div>
              <Link
                href={`/${rol}/valoraciones/${p.propuestaId}`}
                className="shrink-0 px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold transition-colors"
              >
                Valorar
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
