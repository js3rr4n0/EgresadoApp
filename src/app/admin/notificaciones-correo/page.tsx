import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getConfiguracionCorreo } from "@/app/actions/notificacionesCorreo";
import { ROLES_NOTIFICACION, leerRolNotificacion } from "@/lib/notificacionesCorreo";
import ConfiguracionCorreoClient from "./ConfiguracionCorreoClient";

const PASOS = [
  {
    titulo: "El administrador configura",
    texto: "Define por rol qué notificaciones se envían por correo y cuáles son obligatorias o configurables.",
  },
  {
    titulo: "El usuario elige",
    texto: "Egresados y asesores activan o desactivan las configurables en sus preferencias; las obligatorias aparecen bloqueadas.",
  },
  {
    titulo: "El sistema decide el envío",
    texto: "Con ambas configuraciones se determina si se enviaría el correo. Por ahora el envío es simulado.",
  },
];

export default async function NotificacionesCorreoAdminPage({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/login");

  const rol = leerRolNotificacion((await searchParams).rol);
  const rolLabel = ROLES_NOTIFICACION.find((r) => r.id === rol)!.label;
  const res = await getConfiguracionCorreo(rol);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-extrabold text-card-dark">Configuración de notificaciones por correo</h1>
        <p className="text-xs text-muted font-medium mt-1">
          Alertas y recordatorios. Las notificaciones dentro del sistema se muestran siempre; esta configuración solo define el envío
          adicional por correo electrónico.
        </p>
      </div>

      <div className="p-4 rounded-xl border bg-amber-50 border-amber-300 text-amber-900 text-xs font-semibold">
        Demostración: el envío real de correos aún no está conectado. Las notificaciones son de ejemplo y se asociarán a eventos del
        sistema más adelante.
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PASOS.map((p, i) => (
          <li key={p.titulo} className="bg-white border border-border rounded-2xl p-4 shadow-sm flex gap-3">
            <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-900">{p.titulo}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {ROLES_NOTIFICACION.map((r) => (
          <Link
            key={r.id}
            href={`/admin/notificaciones-correo?rol=${r.id}`}
            scroll={false}
            role="tab"
            aria-selected={rol === r.id}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
              rol === r.id ? "border-brand-red text-brand-red" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {!res.success ? (
        <div className="p-5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold">{res.error}</div>
      ) : res.notificaciones.length === 0 ? (
        <p className="text-xs text-muted font-semibold">No hay notificaciones configuradas para este rol.</p>
      ) : (
        <ConfiguracionCorreoClient
          key={rol}
          rol={rol}
          rolLabel={rolLabel}
          notificaciones={res.notificaciones.map((n) => ({
            id: n.id,
            nombre: n.nombre,
            descripcion: n.descripcion,
            correoHabilitado: n.correoHabilitado,
            obligatoria: n.obligatoria,
          }))}
        />
      )}
    </div>
  );
}
