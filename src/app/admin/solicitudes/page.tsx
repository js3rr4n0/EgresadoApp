import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { leerSolicitudes } from "@/lib/solicitudesServidor";
import SolicitudesTable from "@/components/solicitudes/SolicitudesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Solicitudes de corrección | Admin" };

/**
 * Solicitudes que no son de empresas: hoy, la corrección de datos del egresado (nombre y carnet). Las de empresa se
 * revisan en Gestión de Empresas (ajustes del 26-nov-2026).
 */
export default async function SolicitudesPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin");
  const datos = await leerSolicitudes("correccion");
  const pendientes = datos.solicitudes.filter((s) => s.estado === "pendiente").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Solicitudes de corrección</h1>
          <p className="text-sm text-muted mt-1">
            Cambios que los egresados piden sobre sus datos registrados (por ejemplo, nombre o carnet) y que requieren la
            aprobación de la administración.
          </p>
        </div>
        <span className={`self-start md:self-auto px-3 py-1.5 rounded-lg text-sm font-bold ${pendientes ? "bg-brand-red text-white" : "bg-gray-100 text-gray-600"}`}>
          {pendientes === 1 ? "1 pendiente" : `${pendientes} pendientes`}
        </span>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <SolicitudesTable solicitudes={datos.solicitudes} vacio="No hay solicitudes de corrección." />
      </div>
      <p className="text-xs text-muted">
        Las solicitudes de empresas nuevas y de actualización de datos de empresas o supervisores están en Gestión de Empresas.
      </p>
    </div>
  );
}
