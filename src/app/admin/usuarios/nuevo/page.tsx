import { getCarreras } from "@/app/actions/usuarios";
import { db } from "@/lib/db";
import { periodos, facultades } from "@/lib/schema";
import { desc } from "drizzle-orm";
import UserForm from "@/components/UserForm";
import Link from "next/link";

export default async function NuevoUsuarioPage() {
  const [res, periodosData, facultadesData] = await Promise.all([
    getCarreras(),
    db.select({ id: periodos.id, nombre: periodos.nombre, activo: periodos.activo })
      .from(periodos)
      .orderBy(desc(periodos.id)),
    db.select({ id: facultades.id, nombre: facultades.nombre }).from(facultades),
  ]);

  const carreras = res.success && res.data ? res.data : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/usuarios"
          className="p-2 bg-white border border-border rounded-lg text-muted hover:text-foreground transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-card-dark">Crear Usuario</h1>
      </div>

      <UserForm carreras={carreras} periodos={periodosData} facultades={facultadesData} />
    </div>
  );
}
