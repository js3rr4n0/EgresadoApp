"use client";

import { useState } from "react";
import { updatePortada } from "@/app/actions/propuestas";
import { invitarIntegrante, expulsarIntegrante, salirDelGrupo } from "@/app/actions/proyecto";
import { useRouter } from "next/navigation";

interface ProyectoPortadaFormProps {
  propuestaId: number;
  userDetails: {
    nombreCompleto: string;
    carnet: string | null;
    carrera: string | null;
    facultad: string | null;
  } | null;
  mesEnvio: string;
  isLocked: boolean;
  isLeader: boolean;
  teamMembers: {
    id: number;
    egresadoId: number;
    estado: string;
    nombreCompleto: string;
    carnet: string | null;
    correo: string;
  }[];
  memberInfo?: {
    integranteId: number;
    liderNombre: string;
    liderCarnet: string | null;
  } | null;
}

export default function ProyectoPortadaForm({
  propuestaId,
  userDetails,
  mesEnvio,
  isLocked,
  isLeader,
  teamMembers,
  memberInfo,
}: ProyectoPortadaFormProps) {
  const router = useRouter();
  const [nombreCompleto, setNombreCompleto] = useState(userDetails?.nombreCompleto || "");
  const [carnet, setCarnet] = useState(userDetails?.carnet || "");
  const [invitingCarnet, setInvitingCarnet] = useState("");
  
  const [pending, setPending] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isReadOnly = isLocked || !isLeader;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setPending(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("nombreCompleto", nombreCompleto);
    formData.append("carnet", carnet);

    const res = await updatePortada(formData);
    if (!res.success) {
      setError(res.error || "Error al actualizar los datos");
    } else {
      setSuccess("Portada guardada correctamente.");
      router.refresh();
    }
    setPending(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !invitingCarnet.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    const res = await invitarIntegrante(propuestaId, invitingCarnet);
    if (!res.success) {
      setError(res.error || "Error al invitar al integrante");
    } else {
      setSuccess("Invitación enviada correctamente.");
      setInvitingCarnet("");
      router.refresh();
    }
    setInviting(false);
  };

  const handleExpulsar = async (integranteId: number) => {
    if (!confirm("¿Seguro que deseas remover a este integrante de tu proyecto?")) return;
    setError(null);
    setSuccess(null);
    const res = await expulsarIntegrante(integranteId);
    if (!res.success) {
      setError(res.error || "Error al retirar al integrante.");
    } else {
      setSuccess("Integrante retirado del equipo.");
      router.refresh();
    }
  };

  const handleLeaveGroup = async () => {
    if (!memberInfo) return;
    if (!confirm("¿Seguro que deseas salir de este proyecto? No podrás ver ni recibir actualizaciones de la propuesta.")) return;
    setError(null);
    const res = await salirDelGrupo(memberInfo.integranteId);
    if (!res.success) {
      setError(res.error || "Error al salir del grupo.");
    } else {
      router.push("/egresado");
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-card-dark">Portada de la Propuesta (Proyecto)</h2>
          <p className="text-sm text-muted">Datos generales del egresado e integrantes del equipo.</p>
        </div>
        {!isLeader && memberInfo && (
          <div className="bg-amber-50 text-amber-800 text-xs px-3 py-1.5 rounded-lg border border-amber-200 font-bold">
            Modo Lectura (Integrante de Equipo)
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">
          {success}
        </div>
      )}

      {!isLeader && memberInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-blue-900 text-sm">Perteneces a un equipo de trabajo</h4>
            <p className="text-xs text-blue-700 mt-1">
              Esta propuesta fue redactada por <strong>{memberInfo.liderNombre}</strong> ({memberInfo.liderCarnet}). 
              Como integrante, puedes visualizar los avances pero no editar los campos.
            </p>
          </div>
          <button
            onClick={handleLeaveGroup}
            type="button"
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Salir del Grupo
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Nombres y Apellidos del Egresado</label>
            <input
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Número de Carnet</label>
            <input
              type="text"
              value={carnet}
              onChange={(e) => setCarnet(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-red text-sm disabled:opacity-75"
              placeholder="Ej: 2020-AB-123"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Carrera / Título al que se opta</label>
            <input
              type="text"
              value={userDetails?.carrera || "No especificada"}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Mes de Envío</label>
            <input
              type="text"
              value={mesEnvio}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-slate-100 text-slate-500 text-sm cursor-not-allowed capitalize"
            />
          </div>
        </div>

        {isLeader && !isLocked && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-red hover:bg-brand-red-hover text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Guardar Portada"}
            </button>
          </div>
        )}
      </form>

      {/* Seccion Integrantes del Equipo */}
      <div className="mt-10 border-t border-border pt-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-card-dark flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Integrantes del Equipo de Proyecto
          </h3>
          <p className="text-xs text-muted mt-1">
            Puedes invitar a otros egresados ingresando su número de carnet.
          </p>
        </div>

        {isLeader && !isLocked && (
          <form onSubmit={handleInvite} className="mb-6 bg-slate-50 border border-border p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={invitingCarnet}
                onChange={(e) => setInvitingCarnet(e.target.value)}
                placeholder="Ingresa el carnet del egresado (Ej: 2020-PM-605)"
                className="w-full px-4 py-2 rounded-lg border border-border bg-white text-sm focus:ring-2 focus:ring-brand-red focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={inviting || !invitingCarnet.trim()}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-5 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
            >
              {inviting ? "Enviando..." : "Añadir Integrante"}
            </button>
          </form>
        )}

        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted bg-slate-50 uppercase font-bold border-b border-border">
              <tr>
                <th className="px-6 py-3">Egresado</th>
                <th className="px-6 py-3">Carnet</th>
                <th className="px-6 py-3">Estado</th>
                {isLeader && !isLocked && <th className="px-6 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Leader row */}
              <tr className="bg-slate-50/50">
                <td className="px-6 py-4 font-bold text-card-dark">
                  {userDetails?.nombreCompleto} <span className="ml-2 text-xs bg-brand-red text-white px-2 py-0.5 rounded font-semibold">Líder del proyecto</span>
                </td>
                <td className="px-6 py-4 text-muted">{userDetails?.carnet || "N/A"}</td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Aceptado
                  </span>
                </td>
                {isLeader && !isLocked && <td className="px-6 py-4 text-right text-xs text-muted italic">Creador</td>}
              </tr>

              {/* Members rows */}
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-foreground">{member.nombreCompleto}</td>
                  <td className="px-6 py-4 text-muted">{member.carnet || "Sin carnet"}</td>
                  <td className="px-6 py-4">
                    {member.estado === "aceptado" ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        Aceptado
                      </span>
                    ) : member.estado === "pendiente" ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                        Invitación Pendiente
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                        Rechazado
                      </span>
                    )}
                  </td>
                  {isLeader && !isLocked && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleExpulsar(member.id)}
                        type="button"
                        className="text-red-600 hover:text-red-800 font-bold text-xs hover:underline"
                      >
                        Expulsar
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {teamMembers.length === 0 && (
                <tr>
                  <td colSpan={isLeader && !isLocked ? 4 : 3} className="px-6 py-6 text-center text-muted text-xs">
                    No has añadido más integrantes a este proyecto.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
