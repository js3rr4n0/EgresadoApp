import { getOpcionesSeguimiento } from "@/app/actions/seguimientoCohortes";
import SeguimientoCohortes from "@/components/admin/SeguimientoCohortes";

export const dynamic = "force-dynamic";

export default async function SeguimientoCohortesPage() {
  const res = await getOpcionesSeguimiento();
  if (!res.success) return <div className="p-8 text-center text-muted">{res.error}</div>;
  return <SeguimientoCohortes {...res.datos} />;
}
