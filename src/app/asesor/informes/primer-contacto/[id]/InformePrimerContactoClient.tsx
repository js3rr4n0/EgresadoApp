"use client";

import { useState } from "react";
import { guardarBorradorInforme, enviarInformePrimerContacto } from "@/app/actions/informes";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  informeData: any;
  propuesta: any;
  egresado: any;
  supervisor: any;
  empresa: any;
  carrera: any;
  actividades: any[];
}

export default function InformePrimerContactoClient({
  informeData,
  propuesta,
  egresado,
  supervisor,
  empresa,
  carrera,
  actividades,
}: Props) {
  const router = useRouter();

  const isEnviado = informeData.estado === "enviado";
  const isAnulado = informeData.estado === "anulado";

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [contactoPrevio, setContactoPrevio] = useState<boolean | null>(
    informeData.contactoPrevio ?? null
  );
  const [medioContacto, setMedioContacto] = useState<string>(
    informeData.medioContacto || "llamada"
  );
  const [fechaCita, setFechaCita] = useState<string>(
    informeData.fechaCita ? new Date(informeData.fechaCita).toISOString().split("T")[0] : ""
  );
  const [modalidadCita, setModalidadCita] = useState<string>(
    informeData.modalidadCita || "videollamada"
  );
  const [evidenciaUrls, setEvidenciaUrls] = useState<string[]>(
    informeData.evidenciaUrls || []
  );
  const [tempEvidenciaInput, setTempEvidenciaInput] = useState<string>("");

  const [objetivosEntrevista, setObjetivosEntrevista] = useState<string[]>(
    informeData.objetivosEntrevista || ["Consenso del plan de trabajo", "Tiempos de ejecución"]
  );
  const [mecanismosComunicacion, setMecanismosComunicacion] = useState<string[]>(
    informeData.mecanismosComunicacion || ["Correo electrónico", "WhatsApp"]
  );
  const [aceptaInformesMensuales, setAceptaInformesMensuales] = useState<boolean>(
    informeData.aceptaInformesMensuales ?? true
  );
  const [resultadoValidacion, setResultadoValidacion] = useState<
    "aprobada" | "con_modificaciones" | "rechazada"
  >(informeData.resultadoValidacion || "aprobada");
  const [justificacionResultado, setJustificacionResultado] = useState<string>(
    informeData.justificacionResultado || ""
  );

  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calculate live countdown for draft
  const deadline = new Date(informeData.fechaLimite);
  const now = new Date();
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await guardarBorradorInforme(informeData.id, {
      contactoPrevio,
      medioContacto,
      fechaCita,
      modalidadCita,
      evidenciaUrls,
      objetivosEntrevista,
      mecanismosComunicacion,
      aceptaInformesMensuales,
      resultadoValidacion,
      justificacionResultado,
    });

    setSavingDraft(false);
    if (res.success) {
      setSuccessMsg("✓ Borrador guardado exitosamente");
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || "Error al guardar el borrador");
    }
  };

  const handleSubmitFinal = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (contactoPrevio === null) {
      setErrorMsg("Debe responder si ha tenido comunicación previa con el supervisor empresarial.");
      setSubmitting(false);
      return;
    }

    const res = await enviarInformePrimerContacto(informeData.id, {
      contactoPrevio,
      medioContacto,
      fechaCita,
      modalidadCita,
      evidenciaUrls,
      objetivosEntrevista,
      mecanismosComunicacion,
      aceptaInformesMensuales,
      resultadoValidacion,
      justificacionResultado,
    });

    setSubmitting(false);
    if (res.success) {
      setSuccessMsg("¡Informe de Primer Contacto enviado exitosamente!");
      router.refresh();
    } else {
      setErrorMsg(res.error || "Error al enviar el informe");
    }
  };

  const toggleObjetivo = (val: string) => {
    if (objetivosEntrevista.includes(val)) {
      setObjetivosEntrevista(objetivosEntrevista.filter((item) => item !== val));
    } else {
      setObjetivosEntrevista([...objetivosEntrevista, val]);
    }
  };

  const toggleMecanismo = (val: string) => {
    if (mecanismosComunicacion.includes(val)) {
      setMecanismosComunicacion(mecanismosComunicacion.filter((item) => item !== val));
    } else {
      setMecanismosComunicacion([...mecanismosComunicacion, val]);
    }
  };

  const addEvidenciaUrl = () => {
    if (tempEvidenciaInput.trim()) {
      setEvidenciaUrls([...evidenciaUrls, tempEvidenciaInput.trim()]);
      setTempEvidenciaInput("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/asesor/propuestas/${propuesta.id}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all"
        >
          ← Volver a la Propuesta #{propuesta.numero}
        </Link>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Módulo: Informes de Seguimiento — Hito 1
        </span>
      </div>

      {/* Cabecera de Cumplimiento (Frozen or Live Countdown) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-900 font-extrabold text-xs rounded-full">
                📋 Informe de Primer Contacto
              </span>
              {isEnviado ? (
                <span
                  className={`px-3 py-1 font-extrabold text-xs rounded-full border ${
                    informeData.cumplimiento === "a_tiempo"
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-red-100 text-red-900 border-red-300"
                  }`}
                >
                  {informeData.cumplimiento === "a_tiempo" ? "✓ Realizado a tiempo" : "⚠️ Realizado fuera de tiempo"}
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-full">
                  📝 En Borrador
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-2">
              Primer Contacto con Supervisor Empresarial
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Propuesta #{propuesta.numero} ({propuesta.tipo.toUpperCase()}) — {propuesta.titulo || "Trabajo de Graduación"}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-right min-w-[200px]">
            <p className="text-[11px] font-extrabold uppercase text-slate-400">Fecha Límite</p>
            <p className="text-sm font-bold text-slate-800">
              {new Date(informeData.fechaLimite).toLocaleDateString("es-SV", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            {isEnviado ? (
              <p className="text-xs font-bold text-slate-600 mt-1">
                Enviado: {new Date(informeData.enviadoEn).toLocaleDateString("es-SV")} ({informeData.desviacionDias} días de desvío)
              </p>
            ) : (
              <p className={`text-xs font-extrabold mt-1 ${diffDays >= 0 ? "text-emerald-700" : "text-red-600 animate-pulse"}`}>
                {diffDays >= 0 ? `⏳ Quedan ${diffDays} días de plazo` : `🚨 Vencido por ${Math.abs(diffDays)} días`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP NAVIGATION (PASO 1 vs PASO 2) */}
      <div className="flex items-center border-b border-slate-200 gap-4">
        <button
          onClick={() => setCurrentStep(1)}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all cursor-pointer ${
            currentStep === 1
              ? "border-brand-red text-brand-red"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          1. Verificación de Interlocutor
        </button>
        <button
          onClick={() => setCurrentStep(2)}
          className={`pb-3 font-extrabold text-sm border-b-2 transition-all cursor-pointer ${
            currentStep === 2
              ? "border-brand-red text-brand-red"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          2. Guion, Acuerdos y Validación
        </button>
      </div>

      {/* PASO 1: VERIFICACIÓN DE INTERLOCUTOR */}
      {currentStep === 1 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 5.1 Ficha del Supervisor (Solo Lectura) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                👤
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Ficha del Supervisor Empresarial (Verificación de Identidad)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Información registrada de la contraparte institucional para la entrevista.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Supervisor</span>
                <span className="font-extrabold text-slate-900">
                  {supervisor?.titulo || ""} {supervisor?.nombres} {supervisor?.apellidos}
                </span>
                <span className="text-slate-500 block">{supervisor?.cargo || "Sin cargo especificado"}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Empresa / Institución</span>
                <span className="font-extrabold text-slate-900">{empresa?.nombre || "No especificada"}</span>
                <span className="text-slate-500 block truncate">{empresa?.direccion || "Sin dirección"}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Contactos Oficiales</span>
                <span className="font-bold text-slate-800 block">📞 {supervisor?.telefono || "Sin teléfono"}</span>
                <span className="font-bold text-slate-800 block truncate">✉️ {supervisor?.correo || "Sin correo"}</span>
              </div>
            </div>
          </div>

          {/* 5.2 Pregunta que bifurca el flujo */}
          <div className="bg-white border-2 border-indigo-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>¿Ha tenido comunicación con el supervisor empresarial anteriormente?</span>
                <span className="text-red-500 text-xs font-bold">*Obligatorio</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Esta pregunta define la rama de verificación anti-fraude del informe.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="contactoPrevio"
                  disabled={isEnviado}
                  checked={contactoPrevio === true}
                  onChange={() => setContactoPrevio(true)}
                  className="w-4 h-4 text-brand-red focus:ring-brand-red"
                />
                <span>SÍ (Relación o contacto establecido previamente)</span>
              </label>

              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="contactoPrevio"
                  disabled={isEnviado}
                  checked={contactoPrevio === false}
                  onChange={() => setContactoPrevio(false)}
                  className="w-4 h-4 text-brand-red focus:ring-brand-red"
                />
                <span>NO (Primer contacto / Supervisor sin relación previa)</span>
              </label>
            </div>

            {/* RAMA SÍ */}
            {contactoPrevio === true && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                  Especificar Medio de Contacto Previo
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: "llamada", label: "📞 Llamada" },
                    { id: "correo", label: "✉️ Correo" },
                    { id: "videollamada", label: "💻 Videollamada" },
                    { id: "whatsapp", label: "💬 WhatsApp" },
                    { id: "visita", label: "🏢 Visita Física" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isEnviado}
                      onClick={() => setMedioContacto(item.id)}
                      className={`p-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        medioContacto === item.id
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RAMA NO */}
            {contactoPrevio === false && (
              <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <span>🚨 Control Anti-Fraude: Requiere Agendamiento y Evidencia Verificable</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. Fecha de Cita Agendada (Máximo 3 días hábiles/calendario) *
                    </label>
                    <input
                      type="date"
                      disabled={isEnviado}
                      value={fechaCita}
                      onChange={(e) => setFechaCita(e.target.value)}
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Modalidad Restringida de Verificación *
                    </label>
                    <select
                      disabled={isEnviado}
                      value={modalidadCita}
                      onChange={(e) => setModalidadCita(e.target.value)}
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="visita_fisica">🏢 Visita Física Presencial</option>
                      <option value="videollamada">💻 Videollamada (Teams / Meet / Zoom)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Archivo de Evidencia (Captura de pantalla o Fotografía de la visita) *
                  </label>
                  {!isEnviado && (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="URL de la imagen/captura de evidencia..."
                        value={tempEvidenciaInput}
                        onChange={(e) => setTempEvidenciaInput(e.target.value)}
                        className="flex-1 p-2 bg-white border border-amber-300 rounded-xl text-xs"
                      />
                      <button
                        type="button"
                        onClick={addEvidenciaUrl}
                        className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold hover:bg-amber-900"
                      >
                        Adjuntar
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    {evidenciaUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border rounded-lg text-xs">
                        <span className="truncate text-slate-700">{url}</span>
                        {!isEnviado && (
                          <button
                            type="button"
                            onClick={() => setEvidenciaUrls(evidenciaUrls.filter((_, i) => i !== idx))}
                            className="text-red-600 font-bold text-xs"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
            >
              Continuar al Paso 2 (Guion y Validación) →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: GUION DE ENTREVISTA Y VALIDACIÓN */}
      {currentStep === 2 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 6.1 Guion de Presentación */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              6.1 Guion Institucional de Presentación
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              "Buenas tardes. Mi nombre es el docente docente asignado por la Universidad para el Trabajo de Graduación del estudiante{" "}
              <strong className="text-amber-300 font-bold">{egresado?.nombreCompleto || "Egresado"}</strong>, correspondiente a la carrera de{" "}
              <strong className="text-amber-300 font-bold">{carrera?.nombre || "Facultad"}</strong>. Me pongo a su disposición para coordinar el plan de trabajo y asegurar el éxito del proyecto."
            </p>
          </div>

          {/* 6.2 Objetivos de la entrevista */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              6.2 Objetivos de la Entrevista (Mínimo 1 opción)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-slate-700">
              {[
                "Visita del asesor",
                "Consenso del plan de trabajo",
                "Certificación o modificación de actividades",
                "Tiempos de ejecución",
                "Consultas y notificaciones de la empresa",
                "Firma de carta de finalización satisfactoria",
              ].map((obj) => (
                <label key={obj} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isEnviado}
                    checked={objetivosEntrevista.includes(obj)}
                    onChange={() => toggleObjetivo(obj)}
                    className="w-4 h-4 text-brand-red focus:ring-brand-red rounded"
                  />
                  <span>{obj}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 6.3 Mecanismos de comunicación acordados */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              6.3 Mecanismos de Comunicación Acordados (Mínimo 1 opción)
            </h3>
            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
              {["WhatsApp", "Correo electrónico", "Llamadas telefónicas"].map((mec) => (
                <label key={mec} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isEnviado}
                    checked={mecanismosComunicacion.includes(mec)}
                    onChange={() => toggleMecanismo(mec)}
                    className="w-4 h-4 text-brand-red focus:ring-brand-red rounded"
                  />
                  <span>{mec}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 6.4 Expectativas sobre informes mensuales */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              6.4 Expectativas sobre Informes Mensuales
            </h3>
            <div className="flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="informesMensuales"
                  disabled={isEnviado}
                  checked={aceptaInformesMensuales === true}
                  onChange={() => setAceptaInformesMensuales(true)}
                  className="w-4 h-4 text-brand-red"
                />
                <span>✓ El supervisor SÍ está de acuerdo con los informes mensuales</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="informesMensuales"
                  disabled={isEnviado}
                  checked={aceptaInformesMensuales === false}
                  onChange={() => setAceptaInformesMensuales(false)}
                  className="w-4 h-4 text-brand-red"
                />
                <span>⚠️ El supervisor NO está de acuerdo (Genera Alerta al Coordinador)</span>
              </label>
            </div>
          </div>

          {/* 6.5 Campo Crítico: Validación de Actividades */}
          <div className="bg-white border-2 border-brand-red/30 rounded-2xl p-6 shadow-md space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>6.5 Validación de Actividades del Plan de Trabajo (Campo Crítico)</span>
                <span className="text-brand-red text-xs font-bold">*Obligatorio</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Postura oficial del supervisor empresarial sobre el plan propuesto por el estudiante.
              </p>
            </div>

            {/* Activities summary */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-48 overflow-y-auto">
              <h4 className="text-[11px] font-extrabold uppercase text-slate-500">Actividades Registradas ({actividades.length}):</h4>
              <ul className="text-xs space-y-1 text-slate-700">
                {actividades.map((act) => (
                  <li key={act.id}>
                    • <strong>Período {act.periodo}, Semana {act.semana}:</strong> {act.titulo} ({act.descripcion})
                  </li>
                ))}
              </ul>
            </div>

            {/* Decision options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                disabled={isEnviado}
                onClick={() => setResultadoValidacion("aprobada")}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  resultadoValidacion === "aprobada"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block font-extrabold text-sm">🟢 APROBADA</span>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  El supervisor está de acuerdo. El TG avanza a desarrollo.
                </span>
              </button>

              <button
                type="button"
                disabled={isEnviado}
                onClick={() => setResultadoValidacion("con_modificaciones")}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  resultadoValidacion === "con_modificaciones"
                    ? "bg-amber-50 border-amber-500 text-amber-950 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block font-extrabold text-sm">🟡 CON MODIFICACIONES</span>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Parcialmente de acuerdo. Abre correcciones para el estudiante.
                </span>
              </button>

              <button
                type="button"
                disabled={isEnviado}
                onClick={() => setResultadoValidacion("rechazada")}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  resultadoValidacion === "rechazada"
                    ? "bg-red-50 border-red-500 text-red-950 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block font-extrabold text-sm">🔴 RECHAZADA</span>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Supervisor NO acepta. El TG entra en suspensión.
                </span>
              </button>
            </div>

            {/* Mandatory Justification textarea for modifications / rejection */}
            {resultadoValidacion !== "aprobada" && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <label className="block text-xs font-extrabold text-slate-900">
                  Justificación Obligatoria para la Decisión ({resultadoValidacion === "con_modificaciones" ? "Modificaciones Requeridas" : "Motivo de Rechazo"}) *
                </label>
                <textarea
                  rows={4}
                  disabled={isEnviado}
                  value={justificacionResultado}
                  onChange={(e) => setJustificacionResultado(e.target.value)}
                  placeholder="Escriba detalladamente las observaciones o razones indicadas por el supervisor..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-brand-red focus:border-brand-red font-medium"
                />
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          {!isEnviado && !isAnulado && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {savingDraft ? "Guardando..." : "💾 Guardar Borrador"}
              </button>

              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={submitting}
                className="px-6 py-3 bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {submitting ? "Enviando Informe..." : "🚀 Enviar Informe Final"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
