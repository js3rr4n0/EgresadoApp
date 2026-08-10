"use client";

import { useState } from "react";
import { updatePortada, solicitarCorreccionDatosDecanato, updateTituloPropuesta } from "@/app/actions/propuestas";
import {
  invitarIntegrante,
  expulsarIntegrante,
  salirDelGrupo,
  ratificarPropuesta,
  transferirLiderazgo,
  retirarseDelProyecto,
} from "@/app/actions/proyecto";
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
  isInvestigacion?: boolean;
  initialTitulo?: string | null;
}

export default function ProyectoPortadaForm({
  propuestaId,
  userDetails,
  mesEnvio,
  isLocked,
  isLeader,
  teamMembers,
  memberInfo,
  isInvestigacion = false,
  initialTitulo = "",
}: ProyectoPortadaFormProps) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(initialTitulo || "");
  const [savingTitulo, setSavingTitulo] = useState(false);
  const [nombreCompleto] = useState(userDetails?.nombreCompleto || "");
  const [carnet] = useState(userDetails?.carnet || "");
  const [invitingInput, setInvitingInput] = useState("");
  
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isReadOnly = isLocked || !isLeader;

  const handleSaveTituloAndContinue = async () => {
    if (!titulo.trim()) {
      alert("Por favor ingresa el título de la propuesta.");
      return;
    }
    setSavingTitulo(true);
    const res = await updateTituloPropuesta(propuestaId, titulo);
    setSavingTitulo(false);

    if (res.success) {
      router.push(`?id=${propuestaId}&step=2`);
    } else {
      alert(res.error || "Error al actualizar el título.");
    }
  };

  // Modal Datos Erróneos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalNombre, setModalNombre] = useState(userDetails?.nombreCompleto || "");
  const [modalCarnet, setModalCarnet] = useState(userDetails?.carnet || "");
  const [modalJustificacion, setModalJustificacion] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !invitingInput.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    const res = await invitarIntegrante(propuestaId, invitingInput);
    if (!res.success) {
      setError(res.error || "Error al invitar al integrante");
    } else {
      setSuccess("Invitación enviada correctamente.");
      setInvitingInput("");
      router.refresh();
    }
    setInviting(false);
  };

  const handleExpulsar = async (integranteId: number) => {
    if (!confirm("¿Seguro que deseas remover a este integrante de tu equipo?")) return;
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

  const [ratifying, setRatifying] = useState(false);

  const handleRatificar = async () => {
    setRatifying(true);
    setError(null);
    setSuccess(null);
    const res = await ratificarPropuesta(propuestaId);
    setRatifying(false);
    if (!res.success) {
      setError(res.error || "Error al ratificar la propuesta.");
    } else {
      setSuccess(res.message || "Versión del plan de trabajo ratificada exitosamente con la huella digital.");
      router.refresh();
    }
  };

  const handleTransferir = async (nuevoLiderId: number, nombre: string) => {
    if (!confirm(`¿Seguro que deseas transferir el rol de coordinador del equipo a ${nombre}?`)) return;
    setError(null);
    setSuccess(null);
    const res = await transferirLiderazgo(propuestaId, nuevoLiderId);
    if (!res.success) {
      setError(res.error || "Error al transferir la coordinación.");
    } else {
      setSuccess(res.message || "Coordinación transferida.");
      router.refresh();
    }
  };

  const handleLeaveGroup = async () => {
    if (!memberInfo && !isLeader) return;
    if (!confirm("¿Seguro que deseas salir de este equipo? No podrás ver ni recibir actualizaciones de la propuesta.")) return;
    setError(null);
    const res = isLeader ? await retirarseDelProyecto(propuestaId) : (memberInfo ? await salirDelGrupo(memberInfo.integranteId) : { success: false, error: "No autorizado" });
    if (!res.success) {
      setError(res.error || "Error al salir del grupo.");
    } else {
      router.push("/egresado");
    }
  };

  const handleSendCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError(null);
    setModalSuccess(null);

    const formData = new FormData();
    formData.append("propuestaId", propuestaId.toString());
    formData.append("nombrePropuesto", modalNombre);
    formData.append("carnetPropuesto", modalCarnet);
    formData.append("justificacion", modalJustificacion);

    const res = await solicitarCorreccionDatosDecanato(formData);
    setModalSaving(false);

    if (res.success) {
      setModalSuccess(res.message || "Solicitud enviada al Decanato exitosamente.");
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(null);
      }, 2000);
    } else {
      setModalError(res.error || "Error al enviar la solicitud.");
    }
  };

  const InputLock = () => (
    <div className="absolute right-3 top-3 text-slate-400">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-card-dark">
            {isInvestigacion ? "Portada de la Propuesta (Investigación)" : "Portada de la Propuesta (Proyecto)"}
          </h2>
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

      <div className="space-y-6">
        {/* Campo Título de la Propuesta (EDITABLE) */}
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-4 space-y-2">
          <label className="block text-sm font-extrabold text-amber-900 uppercase tracking-wide flex items-center justify-between">
            <span>Título de la Propuesta <span className="text-red-600">*</span></span>
            <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase">
              {isReadOnly ? "Modo Lectura" : "Campo Editable"}
            </span>
          </label>
          <textarea 
            rows={2}
            readOnly={isReadOnly}
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)} 
            placeholder="Ingresa el título oficial de tu propuesta..."
            className={`w-full px-4 py-2.5 rounded-lg border border-amber-300 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors resize-none ${
              isReadOnly ? "bg-slate-100 text-slate-700 cursor-not-allowed" : "bg-white text-card-dark"
            }`} 
          />
          <p className="text-xs text-amber-800 font-medium">
            💡 Este es el título oficial que aparecerá en la portada de tu Hoja de Inscripción.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Nombres y Apellidos del Egresado</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={nombreCompleto}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm cursor-not-allowed focus:outline-none"
              />
              <InputLock />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Número de Carnet</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={carnet}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm cursor-not-allowed focus:outline-none"
              />
              <InputLock />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Carrera / Título al que se opta</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={userDetails?.carrera || "No especificada"}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm cursor-not-allowed focus:outline-none"
              />
              <InputLock />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-card-dark mb-2">Mes de Envío</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={mesEnvio}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm cursor-not-allowed capitalize focus:outline-none"
              />
              <InputLock />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            ¿Datos erróneos?
          </button>

          {!isReadOnly && (
            <button
              type="button"
              disabled={savingTitulo}
              onClick={handleSaveTituloAndContinue}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#b90000] hover:bg-[#a00000] text-white font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {savingTitulo ? "Guardando..." : "Guardar y Continuar"}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Seccion Integrantes del Equipo */}
      <div className="mt-10 border-t border-border pt-8">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-card-dark flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {isInvestigacion ? "Integrantes del Equipo de Investigación" : "Integrantes del Equipo de Proyecto"}
          </h3>
          <p className="text-xs text-muted mt-1">
            Puedes invitar a otros egresados ingresando su número de carnet o correo electrónico.
          </p>
        </div>

        {isLeader && !isLocked && (
          <form onSubmit={handleInvite} className="mb-6 bg-slate-50 border border-border p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={invitingInput}
                onChange={(e) => setInvitingInput(e.target.value)}
                placeholder="Ingresa el carnet o correo del egresado (Ej: 2020-PM-605 o correo@ejemplo.com)"
                className="w-full px-4 py-2 rounded-lg border border-border bg-white text-sm focus:ring-2 focus:ring-brand-red focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={inviting || !invitingInput.trim()}
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
                <th className="px-6 py-3">Carnet / Correo</th>
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
                  <td className="px-6 py-4 text-muted">
                    <div className="font-bold text-slate-800">{member.carnet || "Sin carnet"}</div>
                    {member.correo && <div className="text-xs text-slate-500 font-normal">{member.correo}</div>}
                  </td>
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
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      {member.estado === "aceptado" && (
                        <button
                          onClick={() => handleTransferir(member.egresadoId, member.nombreCompleto)}
                          type="button"
                          className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline"
                          title="Transferir el rol de coordinador del grupo a este integrante"
                        >
                          Transferir Rol
                        </button>
                      )}
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

        {/* Section: Ratificación Unánime del Plan de Trabajo (§8) */}
        {!isLocked && (
          <div className="mt-6 bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    §8 Ratificación Unánime
                  </span>
                  <h4 className="font-bold text-sm text-white">Firma de Conformidad del Equipo</h4>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Cada integrante del equipo debe ratificar de forma individual la versión final del proyecto.
                  Toda modificación posterior al título, alcance o actividades invalidará las firmas previas para garantizar el acuerdo unánime.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRatificar}
                  disabled={ratifying}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {ratifying ? "Ratificando..." : "Ratificar Versión Actual"}
                </button>

                {(!isLeader || teamMembers.length > 0) && (
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-red-400 font-semibold text-xs px-3 py-2.5 rounded-lg transition-colors border border-slate-700 hover:border-red-900/50"
                  >
                    Retirarse del Equipo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-border">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-card-dark">Solicitud de Corrección de Datos</h3>
                  <p className="text-xs text-muted mt-1">Si la información de tu carnet o nombre es incorrecta, envía una solicitud de revisión al Decanato.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendCorrectionRequest}>
              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium">
                    {modalError}
                  </div>
                )}
                {modalSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
                    {modalSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-card-dark mb-1">Nombre Completo Solicitado <span className="text-brand-red">*</span></label>
                  <input
                    type="text"
                    required
                    value={modalNombre}
                    onChange={(e) => setModalNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-card-dark mb-1">Número de Carnet Solicitado <span className="text-brand-red">*</span></label>
                  <input
                    type="text"
                    required
                    value={modalCarnet}
                    onChange={(e) => setModalCarnet(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-card-dark mb-1">Justificación / Motivo del cambio</label>
                  <textarea
                    rows={3}
                    placeholder="Explica brevemente por qué tus datos son incorrectos..."
                    value={modalJustificacion}
                    onChange={(e) => setModalJustificacion(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:outline-none"
                  />
                </div>

                {/* Informative warning notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>
                    <strong>Importante:</strong> Al enviar estos cambios a revisión, tu propuesta quedará <strong>pausada</strong> y en modo solo lectura hasta que el Decanato o la Administración aprueben los datos.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-card-dark font-bold text-xs bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {modalSaving ? "Enviando a revisión..." : "Guardar y Enviar a revisión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
