import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { leerAsesores } from "@/lib/asesoresServidor";
import TablaAsesores from "@/components/asesores/TablaAsesores";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asesores | Admin" };

export default async function AsesoresAdminPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");
  const { filas, carreras } = await leerAsesores();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Asesores</h2>
        <p className="text-sm text-gray-500 mt-1">
          Rendimiento y récord de los asesores: procesos, cohortes, empresas y la valoración de los egresados al cerrar cada proceso.
        </p>
      </div>
      <TablaAsesores filas={filas} carreras={carreras} rutaBase="/admin/asesores" gestionar />
    </div>
  );
}
