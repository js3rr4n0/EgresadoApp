import { reglasPasantiaDePropuesta } from "@/lib/reglasPasantiaPropuesta";
import { esCapituloExtra, leerApartadosExtra } from "@/lib/fichas/documentoFinalPasantia";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { formatearFechaHoraElSalvador, esInformeFinal } from "@/lib/periodosPasantia";
import { leerCartaFinalizacion, leerIntroduccion, leerGlosario, glosarioOrdenado } from "@/lib/informeFinal";
import { getEnvioInformeMensual } from "@/app/actions/informesMensuales";
import EnvioInformeClient from "./EnvioInformeClient";

export default async function EnvioInformePage({ params }: { params: Promise<{ informeId: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    redirect("/login");
  }

  const { informeId } = await params;
  const id = Number(informeId);
  if (!Number.isFinite(id)) notFound();

  const res = await getEnvioInformeMensual(id);
  if (!res.success || !res.informe || !res.requisitos) {
    return (
      <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">
        {res.error || "No se pudo cargar el informe."}
      </div>
    );
  }

  // Entrega W2: informes y páginas mínimas de la ficha de la pasantía (fase 1: 5 y 20).
  const reglas = await reglasPasantiaDePropuesta(res.informe.propuestaId);
  const carta = leerCartaFinalizacion(res.informe.cartaFinalizacion);
  return (
    <EnvioInformeClient
      final={
        esInformeFinal(res.informe.numero, reglas.periodos)
          ? {
              agradecimientos: res.informe.agradecimientos ?? "",
              introduccion: leerIntroduccion(res.informe.introduccion),
              glosario: glosarioOrdenado(leerGlosario(res.informe.glosario)),
              carta: carta ? { nombre: carta.nombre, url: carta.url } : null,
              cartaVerificada: !!res.informe.cartaFinalizacionVerificadaEn,
              // Entrega W3: partes del documento final que pide la ficha y los capítulos de texto que agrega.
              conIntroduccion: reglas.documentoFinal.capitulos.some((c) => c.clave === "introduccion" && c.activo),
              conAgradecimientos: reglas.documentoFinal.agradecimientos,
              conGlosario: reglas.documentoFinal.anexos.some((a) => a.clave === "glosario" && a.activo),
              conCarta: reglas.documentoFinal.anexos.some((a) => a.clave === "carta" && a.activo),
              extras: reglas.documentoFinal.capitulos.filter((c) => c.activo && esCapituloExtra(c.clave)).map((c) => ({
                clave: c.clave, titulo: c.titulo, ayuda: c.ayuda ?? "", minPalabras: c.minPalabras ?? 0, maxPalabras: c.maxPalabras ?? 0,
                texto: leerApartadosExtra(res.informe.apartadosExtra)[c.clave] ?? "",
              })),
            }
          : null
      }
      informe={{
        id: res.informe.id,
        numero: res.informe.numero,
        estado: res.informe.estado,
        fechaLimite: res.informe.fechaLimite,
        enviadoEn: formatearFechaHoraElSalvador(res.informe.enviadoEn),
        cumplimiento: res.informe.cumplimiento,
        comentarioAsesor: res.informe.comentarioAsesor,
        totalInformes: reglas.periodos,
        paginasMinimas: reglas.paginasMinimas,
      }}
      periodo={res.periodo ? { inicio: res.periodo.inicio, fin: res.periodo.fin } : null}
      requisitos={res.requisitos}
      advertencias={res.advertencias ?? []}
      paginasEstimadas={res.paginasEstimadas ?? 0}
      puedeEnviar={!!res.puedeEnviar}
    />
  );
}
