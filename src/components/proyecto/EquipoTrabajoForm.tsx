"use client";

// Paso «Equipo de trabajo» (specs/REDACTAR_PROPUESTA_AJUSTES.md, R1): antes de la portada se decide si el proyecto o la
// investigación es individual o en grupo, porque eso define cómo se comporta la ficha (cantidad de objetivos, firmas,
// documentos por integrante). Siempre se puede volver a este paso para agregar o quitar integrantes.
// La sección de integrantes salió de ProyectoPortadaForm sin cambiar su comportamiento.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  invitarIntegrante,
  expulsarIntegrante,
  salirDelGrupo,
  ratificarPropuesta,
  transferirLiderazgo,
  retirarseDelProyecto,
  getEstadoFirmasPropuesta,
} from "@/app/actions/proyecto";

interface Integrante {
  id: number;
  egresadoId: number;
  estado: string;
  nombreCompleto: string;
  carnet: string | null;
  correo: string;
}

function Opcion({ activo, bloqueado, titulo, texto, onClick }: { activo: boolean; bloqueado: boolean; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueado && !activo}
      className={`text-left rounded-xl border p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activo ? "border-brand-red bg-red-50/40 ring-1 ring-brand-red" : "border-border bg-white hover:border-gray-400"}`}
    >
      <span className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${activo ? "border-brand-red bg-brand-red shadow-[inset_0_0_0_2px_white]" : "border-gray-300"}`} />
        <span className="font-bold text-gray-800">{titulo}</span>
      </span>
      <span className="block text-xs text-muted mt-1 pl-6">{texto}</span>
    </button>
  );
}

export default function EquipoTrabajoForm({
  propuestaId,
  pasoSiguiente,
  userDetails,
  isLocked,
  isLeader,
  teamMembers,
  memberInfo,
  isInvestigacion = false,
}: {
  propuestaId: number;
  pasoSiguiente: number;
  userDetails: { nombreCompleto: string; carnet: string | null } | null;
  isLocked: boolean;
  isLeader: boolean;
  teamMembers: Integrante[];
  memberInfo?: { integranteId: number; liderNombre: string; liderCarnet: string | null } | null;
  isInvestigacion?: boolean;
}) {
  const router = useRouter();
  const vigentes = teamMembers.filter((m) => m.estado === "aceptado" || m.estado === "pendiente");
  // La elección no se guarda aparte: con integrantes (aceptados o invitados) el trabajo es en grupo.
  const [modo, setModo] = useState<"individual" | "grupo">(vigentes.length > 0 || !isLeader ? "grupo" : "individual");
  const [invitingInput, setInvitingInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const editable = isLeader && !isLocked;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable || !invitingInput.trim()) return;
    setInviting(true);
    setError(null);
    setSuccess(null);
    const res = await invitarIntegrante(propuestaId, invitingInput);
    if (!res.success) setError(res.error || "Error al invitar al integrante");
    else {
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
    if (!res.success) setError(res.error || "Error al retirar al integrante.");
    else {
      setSuccess("Integrante retirado del equipo.");
      router.refresh();
    }
  };

  // H26: quién ratificó la versión actual y a quién le falta (o se le venció la firma por un cambio).
  type EstadoFirmas = Awaited<ReturnType<typeof getEstadoFirmasPropuesta>>;
  const [firmas, setFirmas] = useState<EstadoFirmas>(null);
  const [ratifying, setRatifying] = useState(false);
  const cargarFirmas = useCallback(() => {
    getEstadoFirmasPropuesta(propuestaId).then(setFirmas).catch(() => setFirmas(null));
  }, [propuestaId]);
  useEffect(() => {
    cargarFirmas();
  }, [cargarFirmas, teamMembers.length]);

  const handleRatificar = async () => {
    setRatifying(true);
    setError(null);
    setSuccess(null);
    const res = await ratificarPropuesta(propuestaId);
    setRatifying(false);
    if (!res.success) setError(res.error || "Error al ratificar la propuesta.");
    else {
      setSuccess(res.message || "Versión de la propuesta ratificada.");
      cargarFirmas();
      router.refresh();
    }
  };

  const handleTransferir = async (nuevoLiderId: number, nombre: string) => {
    if (!confirm(`¿Seguro que deseas transferir el rol de coordinador del equipo a ${nombre}?`)) return;
    setError(null);
    setSuccess(null);
    const res = await transferirLiderazgo(propuestaId, nuevoLiderId);
    if (!res.success) setError(res.error || "Error al transferir la coordinación.");
    else {
      setSuccess(res.message || "Coordinación transferida.");
      router.refresh();
    }
  };

  const handleLeaveGroup = async () => {
    if (!memberInfo && !isLeader) return;
    if (!confirm("¿Seguro que deseas salir de este equipo? No podrás ver ni recibir actualizaciones de la propuesta.")) return;
    setError(null);
    const res = isLeader ? await retirarseDelProyecto(propuestaId) : memberInfo ? await salirDelGrupo(memberInfo.integranteId) : { success: false, error: "No autorizado" };
    if (!res.success) setError(res.error || "Error al salir del grupo.");
    else router.push("/egresado");
  };

  const lider = isLeader
    ? { nombre: userDetails?.nombreCompleto ?? "", carnet: userDetails?.carnet ?? null }
    : { nombre: memberInfo?.liderNombre ?? "", carnet: memberInfo?.liderCarnet ?? null };

  return (
    <div className="bg-white border border-border rounded-xl p-6 lg:p-8 shadow-sm">
      <div className="mb-6 border-b border-border pb-4 flex justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold text-card-dark">Equipo de trabajo</h2>
          <p className="text-sm text-muted">
            Decide si {isInvestigacion ? "la investigación" : "el proyecto"} será individual o en grupo. Puedes volver a este paso más adelante para
            agregar o quitar integrantes.
          </p>
        </div>
        {!isLeader && memberInfo && (
          <span className="shrink-0 bg-amber-50 text-amber-800 text-xs px-3 py-1.5 rounded-lg border border-amber-200 font-bold">Modo lectura (integrante)</span>
        )}
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">{error}</div>}
      {success && <div className="mb-6 p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm font-medium">{success}</div>}

      {!isLeader && memberInfo && (
        <div className="mb-6 p-4 bg-gray-50 border border-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Perteneces a un equipo de trabajo</h4>
            <p className="text-xs text-muted mt-1">
              La propuesta la redacta <strong>{memberInfo.liderNombre}</strong> ({memberInfo.liderCarnet}). Como integrante, ves los avances pero no
              editas los campos.
            </p>
          </div>
          <button onClick={handleLeaveGroup} type="button" className="shrink-0 border border-red-300 text-red-700 hover:bg-red-50 font-bold text-xs px-4 py-2 rounded-lg transition-colors">
            Salir del grupo
          </button>
        </div>
      )}

      {/* Modalidad de trabajo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Opcion activo={modo === "individual"} bloqueado={!editable || vigentes.length > 0} onClick={() => setModo("individual")} titulo="Individual" texto={`Redactas y ejecutas ${isInvestigacion ? "la investigación" : "el proyecto"} sin otros integrantes.`} />
        <Opcion activo={modo === "grupo"} bloqueado={!editable} onClick={() => setModo("grupo")} titulo="En grupo" texto="Invitas a otros egresados con su carnet o correo; cada uno acepta la invitación desde su panel." />
      </div>
      {modo === "individual" && vigentes.length > 0 && (
        <p className="mb-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Tienes integrantes en el equipo. Para trabajar de forma individual, retíralos primero.
        </p>
      )}

      {modo === "individual" ? (
        <p className="text-sm text-gray-700 bg-gray-50 border border-border rounded-lg px-4 py-3">
          <strong>Trabajo individual:</strong> al enviar la propuesta queda ratificada la versión enviada. Si más adelante se une alguien, vuelve a
          este paso y elige «En grupo».
        </p>
      ) : (
        <div>
          {editable && (
            <form onSubmit={handleInvite} className="mb-6 bg-gray-50 border border-border p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={invitingInput}
                onChange={(e) => setInvitingInput(e.target.value)}
                placeholder="Carnet o correo del egresado (Ej: 2020-PM-605 o correo@ejemplo.com)"
                className="flex-1 w-full px-4 py-2 rounded-lg border border-border bg-white text-sm focus:ring-2 focus:ring-brand-red focus:outline-none"
              />
              <button
                type="submit"
                disabled={inviting || !invitingInput.trim()}
                className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white font-bold text-sm px-5 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              >
                {inviting ? "Enviando..." : "Añadir integrante"}
              </button>
            </form>
          )}

          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-card-dark bg-gray-50 uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">Egresado</th>
                  <th className="px-5 py-3">Carnet / correo</th>
                  <th className="px-5 py-3">Estado</th>
                  {editable && <th className="px-5 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-gray-50/50">
                  <td className="px-5 py-3.5 font-bold text-card-dark">
                    {lider.nombre} <span className="ml-2 text-[11px] bg-brand-red text-white px-2 py-0.5 rounded font-semibold">Líder {isInvestigacion ? "de la investigación" : "del proyecto"}</span>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{lider.carnet || "N/A"}</td>
                  <td className="px-5 py-3.5"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">Aceptado</span></td>
                  {editable && <td className="px-5 py-3.5 text-right text-xs text-muted">Creador</td>}
                </tr>
                {teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-medium text-foreground">{m.nombreCompleto}</td>
                    <td className="px-5 py-3.5 text-muted">
                      <div className="font-bold text-gray-800">{m.carnet || "Sin carnet"}</div>
                      {m.correo && <div className="text-xs text-gray-500">{m.correo}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.estado === "aceptado" ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">Aceptado</span>
                      ) : m.estado === "pendiente" ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">Invitación pendiente</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">Rechazado</span>
                      )}
                    </td>
                    {editable && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {m.estado === "aceptado" && (
                            <button onClick={() => handleTransferir(m.egresadoId, m.nombreCompleto)} type="button" className="text-gray-600 hover:text-brand-red font-semibold text-xs hover:underline" title="Transferir el rol de líder a este integrante">
                              Transferir rol
                            </button>
                          )}
                          <button onClick={() => handleExpulsar(m.id)} type="button" className="text-red-600 hover:text-red-800 font-bold text-xs hover:underline">
                            Quitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {teamMembers.length === 0 && (
                  <tr>
                    <td colSpan={editable ? 4 : 3} className="px-5 py-6 text-center text-muted text-xs">
                      Todavía no has añadido integrantes a {isInvestigacion ? "esta investigación" : "este proyecto"}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ratificación unánime (§8): solo cuando hay integrantes aceptados */}
          {!isLocked && teamMembers.some((m) => m.estado === "aceptado") && (
            <div className="mt-6 rounded-xl border border-border bg-gray-50 p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-gray-800">Firma de conformidad del equipo</h4>
                  <p className="text-xs text-muted mt-1 max-w-2xl">
                    Cada integrante ratifica de forma individual la versión final de la propuesta. Cualquier cambio posterior invalida las firmas
                    previas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleRatificar}
                    disabled={ratifying}
                    className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {ratifying ? "Ratificando..." : "Ratificar versión actual"}
                  </button>
                  {(!isLeader || teamMembers.length > 0) && (
                    <button type="button" onClick={handleLeaveGroup} className="w-full sm:w-auto border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs px-3 py-2.5 rounded-lg transition-colors">
                      Retirarse del equipo
                    </button>
                  )}
                </div>
              </div>
              {firmas && (
                <div className="mt-4 pt-3 border-t border-border space-y-1.5">
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                    Firmas de la versión actual: {firmas.miembros.filter((m) => m.firmado).length} de {firmas.miembros.length}
                    {firmas.todosFirmaron ? " · lista para enviar" : ""}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {firmas.miembros.map((m) => (
                      <li
                        key={m.usuarioId}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${m.firmado ? "bg-green-50 text-green-800 border-green-200" : m.vencida ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-white text-gray-600 border-border"}`}
                      >
                        {m.nombre}
                        {m.esLider ? " (líder)" : ""}
                        <span className="font-normal"> · {m.firmado ? "firmó" : m.vencida ? "debe volver a firmar" : "falta firmar"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <button
          type="button"
          onClick={() => router.push(`?id=${propuestaId}&step=${pasoSiguiente}`)}
          disabled={editable && modo === "individual" && vigentes.length > 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          Continuar a la portada
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </div>
    </div>
  );
}
