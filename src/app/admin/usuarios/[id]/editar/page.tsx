import { getUsuario, getCarreras } from "@/app/actions/usuarios";
import EditUserForm from "@/components/EditUserForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const userId = parseInt(p.id);
  
  if (isNaN(userId)) {
    notFound();
  }

  const [userRes, carrerasRes] = await Promise.all([
    getUsuario(userId),
    getCarreras()
  ]);

  if (!userRes.success || !userRes.data) {
    notFound();
  }

  const carreras = carrerasRes.success && carrerasRes.data ? carrerasRes.data : [];

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
        <h1 className="text-2xl font-bold text-card-dark">Editar Usuario</h1>
      </div>

      <EditUserForm user={userRes.data} carreras={carreras} />
    </div>
  );
}
