// Fichas base: describen con el formato de fichas lo que la fase 1 hace hoy para cada modalidad.
// Son el punto de partida del constructor y la referencia para comprobar que el sistema no cambia de comportamiento
// cuando empiece a leer las reglas desde la ficha. Módulo puro.
//
// Los valores salen de las constantes del código cuando están exportadas. Los que hoy están escritos dentro de
// archivos "use server" o de componentes se copian aquí; scripts/fichas/verificar_fichas.ts revisa que sigan iguales.
import { DIAS_POR_PERIODO, DURACION_PASANTIA_DIAS, SEMANAS_POR_PERIODO } from "@/lib/periodosPasantia";
import {
  CONCLUSION_MAX_PALABRAS,
  CONCLUSION_MIN_PALABRAS,
  DESCRIPTOR_MAX_PALABRAS,
  DESCRIPTOR_MIN_PALABRAS,
} from "@/lib/reglasRegistroActividad";
import { MAX_IMAGENES_ACTIVIDAD } from "@/lib/fuenteImagen";
import { PAGINAS_MINIMAS_INFORME } from "@/lib/metricaPaginas";
import { DIA_FIN_VISITA, DIA_INICIO_VISITA } from "@/lib/formularioVisita";
import { COMENTARIO_MIN_PALABRAS } from "@/lib/comentariosAsesor";
import { parametrosPorDefecto } from "./catalogo";
import { FORMATO_DEFINICION, type DefinicionFicha, type Espacio, type EtapaEjecucion, type Modalidad } from "./tipos";

/** Valores de la fase 1 que no están exportados como constantes (ver verificar_fichas.ts). */
export const VALORES_FASE1_COPIADOS = {
  /** CartaForm.tsx y proyecto/CartaProyectoForm.tsx: inicio = emisión + 21 días. */
  diasAnticipacionCarta: 21,
  /** actions/informes.ts: el informe de primer contacto vence 7 días después de creado. */
  diasPrimerContacto: 7,
  /** actions/registrosActividad.ts: DIAS_PLAZO_REVISION. */
  diasRevision: 3,
  /** actions/cambiosActividad.ts: MAX_ELIMINACIONES_POR_MES. */
  eliminacionesPorPeriodo: 1,
  /** actions/informesMensuales.ts: NUMERO_INFORME_VISITA. */
  informeRequisitoVisita: 3,
  /** actions/proyecto.ts: líder + integrantes activos o pendientes < 3. */
  maxIntegrantesEquipo: 3,
} as const;

function espacio(
  id: string,
  elemento: Espacio["elemento"],
  titulo: string,
  descripcion: string,
  origenFase1: string,
  parametros: Espacio["parametros"] = {}
): Espacio {
  return {
    id,
    elemento,
    titulo,
    descripcion,
    ayuda: "",
    obligatorio: true,
    parametros: parametrosPorDefecto(elemento, parametros),
    origenFase1,
  };
}

const carta = (origen: string) =>
  espacio("carta", "carta", "Carta de Aceptación", "Documento de aceptación", origen, {
    diasAnticipacion: VALORES_FASE1_COPIADOS.diasAnticipacionCarta,
    duracionDias: DURACION_PASANTIA_DIAS,
  });

function ejecucionPasantia(): EtapaEjecucion {
  return {
    tipo: "ejecucion",
    id: "ejecucion",
    nombre: "Ejecución",
    inicio: "carta",
    unidad: "dias",
    periodos: DURACION_PASANTIA_DIAS / DIAS_POR_PERIODO,
    duracionPeriodo: DIAS_POR_PERIODO,
    subperiodos: SEMANAS_POR_PERIODO,
    registro: {
      descripcion: { min: DESCRIPTOR_MIN_PALABRAS, max: DESCRIPTOR_MAX_PALABRAS },
      conclusion: { min: CONCLUSION_MIN_PALABRAS, max: CONCLUSION_MAX_PALABRAS },
      imagenes: MAX_IMAGENES_ACTIVIDAD,
    },
    diasRevision: VALORES_FASE1_COPIADOS.diasRevision,
    subperiodosAdelantables: 1,
    eliminacionesPorPeriodo: VALORES_FASE1_COPIADOS.eliminacionesPorPeriodo,
    informe: {
      paginasMinimas: PAGINAS_MINIMAS_INFORME,
      exigirActividadesAprobadas: true,
      comentariosDecanato: { activo: true, minPalabras: COMENTARIO_MIN_PALABRAS },
    },
    diasPrimerContacto: VALORES_FASE1_COPIADOS.diasPrimerContacto,
    hitos: [
      {
        id: "visita",
        nombre: "Visita del asesor",
        desde: DIA_INICIO_VISITA,
        hasta: DIA_FIN_VISITA,
        requisitoDeInforme: VALORES_FASE1_COPIADOS.informeRequisitoVisita,
      },
    ],
  };
}

function pasantia(): DefinicionFicha {
  return {
    formato: FORMATO_DEFINICION,
    modalidad: "pasantia",
    participantes: { min: 1, max: 1 },
    etapas: [
      {
        tipo: "propuesta",
        id: "propuesta",
        nombre: "Propuesta",
        espacios: [
          espacio("portada", "portada", "Portada", "Información general del trabajo", "propuestas.titulo"),
          espacio("empresa", "empresa", "Datos empresariales", "Información de la institución", "propuestas.empresa_id"),
          espacio("supervisor", "supervisor", "Datos de supervisor", "Información del supervisor", "propuestas.supervisor_id"),
          carta("cartas_aceptacion"),
          espacio("cronograma", "cronograma", "Descripción de actividades", "Actividades que realizarás", "actividades"),
          espacio("justificacion", "texto", "Justificación del proceso", "Justificación y objetivos", "propuestas.justificacion_proceso"),
          espacio("documentos", "documentos", "Documentos del estudiante", "Documentos requeridos", "documentos_egresado"),
        ],
      },
      ejecucionPasantia(),
    ],
  };
}

function proyecto(): DefinicionFicha {
  return {
    formato: FORMATO_DEFINICION,
    modalidad: "proyecto",
    participantes: { min: 1, max: VALORES_FASE1_COPIADOS.maxIntegrantesEquipo },
    etapas: [
      {
        tipo: "propuesta",
        id: "propuesta",
        nombre: "Propuesta",
        espacios: [
          espacio("portada", "portada", "Portada", "Información general e integrantes", "propuestas.titulo"),
          espacio("actores", "actores", "Actores intervinientes", "Patrocinador, beneficiario, etc.", "detalles_proyecto.actor_*"),
          carta("cartas_aceptacion"),
          espacio("problema", "texto", "Descripción del problema", "Problema u oportunidad", "detalles_proyecto.descripcion_problema"),
          espacio("justificacion", "texto", "Justificación del proyecto", "Justificación y beneficios", "detalles_proyecto.justificacion"),
          espacio("alcance", "texto", "Alcance del proyecto", "Límites y entregables", "detalles_proyecto.alcance"),
          espacio("objetivos", "objetivos", "Objetivos del proyecto", "Objetivo general y específicos", "detalles_proyecto.objetivo_*"),
          espacio("documentos", "documentos", "Documentación de soporte", "Documentos obligatorios", "documentos_egresado"),
        ],
      },
    ],
  };
}

function investigacion(): DefinicionFicha {
  return {
    formato: FORMATO_DEFINICION,
    modalidad: "investigacion",
    participantes: { min: 1, max: VALORES_FASE1_COPIADOS.maxIntegrantesEquipo },
    etapas: [
      {
        tipo: "propuesta",
        id: "propuesta",
        nombre: "Propuesta",
        espacios: [
          espacio("portada", "portada", "Portada", "Información general e integrantes", "propuestas.titulo"),
          // En investigación el campo "beneficiario" se muestra como "Investigador" y no se pide el ejecutor.
          espacio("actores", "actores", "Actores intervinientes", "Patrocinador, investigador y financista", "detalles_proyecto.actor_*", {
            actores: ["patrocinador", "beneficiario", "financista"],
          }),
          carta("cartas_aceptacion"),
          espacio("problema", "texto", "Descripción del problema", "Problema u oportunidad a investigar", "detalles_proyecto.descripcion_problema"),
          espacio("justificacion", "texto", "Justificación", "Justificación de la investigación", "detalles_proyecto.justificacion"),
          espacio("objetivos", "objetivos", "Objetivos", "Objetivo general y específicos", "detalles_proyecto.objetivo_*"),
          espacio("documentos", "documentos", "Documentación de soporte", "Documentos obligatorios", "documentos_egresado"),
        ],
      },
    ],
  };
}

export const NOMBRES_FICHAS_BASE: Record<Modalidad, string> = {
  pasantia: "Pasantía (fase 1)",
  proyecto: "Proyecto (fase 1)",
  investigacion: "Investigación (fase 1)",
};

/** Definición base de una modalidad. Devuelve siempre una copia nueva que se puede modificar. */
export function definicionBase(modalidad: Modalidad): DefinicionFicha {
  if (modalidad === "pasantia") return pasantia();
  if (modalidad === "proyecto") return proyecto();
  return investigacion();
}
