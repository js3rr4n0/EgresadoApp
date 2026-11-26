import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { carrerasDeCoordinador, leerAsesores } from "@/lib/asesoresServidor";
import TablaAsesores from "@/components/asesores/TablaAsesores";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asesores | Coordinación" };

/** Asesores de las carreras del coordinador, con su récord de valoraciones (entrega V5). Solo lectura. */
export default async function AsesoresCoordinadorPage() {
  const session = await getSession();
  if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) redirect("/login");
  const carreras = session.rol === "coordinador" ? await carrerasDeCoordinador(session.userId) : undefined;
  const { filas, carreras: nombres } = await leerAsesores(carreras);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Asesores</h1>
        <p className="text-sm text-gray-500 mt-1">
          Asesores de tus carreras con su desempeño según la valoración de los egresados al cerrar cada proceso.
        </p>
      </div>
      <TablaAsesores filas={filas} carreras={nombres} rutaBase="/coordinador/asesores" gestionar={false} />
    </div>
  );
}
