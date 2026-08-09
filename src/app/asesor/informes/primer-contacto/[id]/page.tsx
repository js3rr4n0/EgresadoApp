import { getOrCreateInformePrimerContacto } from "@/app/actions/informes";
import InformePrimerContactoClient from "./InformePrimerContactoClient";
import { notFound } from "next/navigation";

export default async function InformePrimerContactoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const propuestaId = parseInt(resolvedParams.id, 10);

  if (isNaN(propuestaId)) {
    notFound();
  }

  const res = await getOrCreateInformePrimerContacto(propuestaId);

  if (!res.success) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-2">
          <h2 className="font-extrabold text-base">Error al cargar Informe de Primer Contacto</h2>
          <p className="text-xs">{res.error}</p>
        </div>
      </div>
    );
  }

  return (
    <InformePrimerContactoClient
      informeData={res.informe}
      propuesta={res.propuesta}
      egresado={res.egresado}
      supervisor={res.supervisor}
      empresa={res.empresa}
      carrera={res.carrera}
      actividades={res.actividades || []}
    />
  );
}
