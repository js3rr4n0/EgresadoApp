import { getUsuarios } from "@/app/actions/usuarios";
import Link from "next/link";
import { db } from "@/lib/db";
import { facultades } from "@/lib/schema";
import UsuariosTable from "@/components/UsuariosTable";

export default async function UsuariosPage() {
  const result = await getUsuarios();
  const usuarios = result.success && result.data ? result.data : [];
  
  const facultiesList = await db.select().from(facultades);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-brand-red">Gestión de Usuarios</h1>
        
        <Link
          href="/admin/usuarios/nuevo"
          className="flex items-center gap-2 bg-card-dark hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </Link>
      </div>

      <UsuariosTable initialUsuarios={usuarios as any} facultades={facultiesList} />
    </div>
  );
}
