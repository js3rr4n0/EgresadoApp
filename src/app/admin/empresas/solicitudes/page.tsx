import { redirect } from "next/navigation";

// Las solicitudes de empresa se revisan ahora al inicio de Gestión de Empresas y las de corrección de datos en
// /admin/solicitudes (ajustes del 26-nov-2026). Esta ruta queda por los enlaces antiguos.
export default function SolicitudesEmpresaPage() {
  redirect("/admin/empresas#solicitudes");
}
