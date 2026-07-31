import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";

async function generateManualPDF() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      addHeaderFooter();
    }
  };

  const addHeaderFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("EgresadoApp UNICAES - Manual de Usuario Oficial", margin, 8);
    doc.text(`Página ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 10, pageWidth - margin, 10);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  };

  // --- PORTADA DEL MANUAL ---
  doc.setFillColor(180, 30, 30); // Brand Red
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("UNIVERSIDAD CATÓLICA DE EL SALVADOR", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("MANUAL DE USUARIO INTEGRAL Y GUÍA DE OPERACIÓN", pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.text("SISTEMA DE GESTIÓN DE TRABAJOS DE GRADUACIÓN (EgresadoApp)", pageWidth / 2, 36, { align: "center" });

  y = 60;

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("ÍNDICE Y ESTRUCTURA DEL MANUAL", margin, y);
  y += 8;

  const indice = [
    "PARTE I: MANUAL OPERATIVO PARA EL ROL EGRESADO (ESTUDIANTE)",
    "  1. Inicio de Sesión y Verificación de Período Académico",
    "  2. Selección de la Modalidad de Trabajo de Graduación",
    "  3. Guía Paso a Paso: Modalidad PASANTÍA (7 Etapas)",
    "  4. Guía Paso a Paso: Modalidad PROYECTO DE GRADUACIÓN (8 Etapas + Equipos)",
    "  5. Guía Paso a Paso: Modalidad INVESTIGACIÓN (7 Etapas + Equipos)",
    "  6. Trabajo en Equipo: Invitación, Aceptación, Expulsión y Salida",
    "  7. Previsualización y Generación del PDF Oficial de Impresión",
    "  8. Seguimiento de Estado y Corrección de Observaciones",
    "",
    "PARTE II: MANUAL OPERATIVO PARA EL ROL ADMINISTRADOR",
    "  9. Acceso y Panel General Administrativo",
    " 10. Módulo de Revisión, Dictamen y Asignación de Asesores",
    " 11. Gestión de Empresas, Sucursales y Solicitudes Pendientes",
    " 12. Mantenimiento de Usuarios y Restablecimiento de Credenciales",
    " 13. Gestión de Períodos Académicos y Recepción de Propuestas",
    " 14. Administración de Facultades y Carreras",
    " 15. Carga Masiva de Egresados mediante Archivo CSV",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 60, 60);

  for (const item of indice) {
    checkPageBreak(5);
    if (item.startsWith("PARTE")) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 30, 30);
      y += 2;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
    }
    doc.text(item, margin, y);
    y += 5;
  }

  doc.addPage();
  y = margin;
  addHeaderFooter();

  // --- PARTE I: EGRESADO ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(180, 30, 30);
  doc.text("PARTE I: GUÍA DETALLADA PARA EL EGRESADO (ESTUDIANTE)", margin, y);
  y += 8;

  const seccionesEgresado = [
    {
      num: "1. Inicio de Sesión y Verificación de Período Académico",
      texto: [
        "1. Directiva de Ingreso: Acceda a la aplicación e ingrese con su Número de Carnet (ejemplo: 2021-EG-001) y su contraseña en /login.",
        "2. Verificación de Estado de Período: Al ingresar al panel principal (/egresado), observe el estado del período académico.",
        "   - Si el período está ACTIVO: Podrá iniciar la creación o edición de su propuesta de graduación.",
        "   - Si el período está CERRADO: El sistema bloqueará la creación de nuevas propuestas e indicará que debe esperar la apertura oficial del próximo período institucional.",
      ],
    },
    {
      num: "2. Selección de la Modalidad de Trabajo de Graduación",
      texto: [
        "Al dar clic en 'Nueva Propuesta', se desplegará el selector con tres opciones principales:",
        "• PASANTÍA: Modalidad individual desarrollada dentro de una empresa o institución con un supervisor asignado.",
        "• PROYECTO: Modalidad grupal o individual orientada a la solución de un problema técnico o desarrollo en empresa/cliente.",
        "• INVESTIGACIÓN: Modalidad grupal o individual enfocada en investigación científica o académica patrocinada.",
      ],
    },
    {
      num: "3. Guía Paso a Paso: Modalidad PASANTÍA (7 Etapas)",
      texto: [
        "• Etapa 1 (Portada): Verifique sus nombres, carnet, carrera y mes de envío.",
        "• Etapa 2 (Empresa y Sucursal): Seleccione la empresa donde realiza la pasantía. Si la empresa no existe en el catálogo, complete la solicitud de registro con la dirección y ubicación exacta en el mapa Leaflet.",
        "• Etapa 3 (Supervisor): Ingrese los nombres, apellidos, cargo, teléfono y correo electrónico de su supervisor empresarial directo.",
        "• Etapa 4 (Carta de Aceptación): Seleccione la fecha de emisión. El sistema calculará automáticamente la Fecha de Inicio (21 días/3 semanas después) y la Fecha de Finalización (150 días de duración). Adjunte la firma del emisor o el PDF oficial.",
        "• Etapa 5 (Plan de Actividades): Registre el plan semanal desglosado por mes (Mes 1, Mes 2, etc.), indicando número de actividad y descripción.",
        "• Etapa 6 (Justificación): Describa detalladamente las razones institucionales y profesionales que justifican su pasantía.",
        "• Etapa 7 (Documentación Obligatoria): Suba en formato PDF la Hoja de Inscripción/Pago de TG, la Constancia de Horas Sociales y la Carta de Servicio Social.",
      ],
    },
    {
      num: "4. Guía Paso a Paso: Modalidad PROYECTO (8 Etapas)",
      texto: [
        "• Etapa 1 (Portada y Equipo): Ingrese la información del proyecto. Si trabaja en equipo, use la función 'Añadir Integrante' e ingrese el carnet de su compañero.",
        "• Etapa 2 (Actores Intervinientes): Registre los 4 actores obligatorios del proyecto: Patrocinador, Beneficiario, Ejecutor y Financista.",
        "• Etapa 3 (Carta de Aceptación): Complete la fecha de emisión y datos del supervisor con cálculo de rango de 21 y 150 días.",
        "• Etapa 4 (Problema u Oportunidad): Redacte la descripción técnica del problema a resolver.",
        "• Etapa 5 (Justificación): Explique la relevancia y valor del proyecto.",
        "• Etapa 6 (Alcance): Delimite los límites técnicos y funcionales del proyecto.",
        "• Etapa 7 (Objetivos): Ingrese 1 Objetivo General y entre 4 y 6 Objetivos Específicos detallados.",
        "• Etapa 8 (Documentos de Soporte): Suba los documentos institucionales requeridos en PDF.",
      ],
    },
    {
      num: "5. Guía Paso a Paso: Modalidad INVESTIGACIÓN (7 Etapas)",
      texto: [
        "• Etapa 1 (Portada e Investigación): Registre la portada como Investigador Principal e invite a colaboradores por carnet.",
        "• Etapa 2 (Actores de Investigación): Complete los 3 actores de investigación: Patrocinador, Investigador y Financista.",
        "• Etapa 3 (Carta de Aceptación): Registre los datos de autorización con las fechas reglamentarias.",
        "• Etapa 4 (Problema a Investigar): Describa el problema objeto de investigación científica.",
        "• Etapa 5 (Justificación): Justifique el aporte académico y científico de la investigación.",
        "• Etapa 6 (Objetivos de Investigación): Ingrese el Objetivo General y los Objetivos Específicos (4 a 6).",
        "• Etapa 7 (Documentos de Soporte): Adjunte la documentación en PDF.",
      ],
    },
    {
      num: "6. Trabajo en Equipo (Invitación, Aceptación y Gestión)",
      texto: [
        "• Invitar Integrante: Ingrese el carnet exacto en la Portada de Proyecto o Investigación. Se enviará una notificación instantánea.",
        "• Responder Invitación: El usuario invitado verá una tarjeta destacada en su panel con las opciones 'Aceptar' o 'Rechazar'.",
        "• Restricción de Edición: Solo el Líder/Investigador Principal puede editar la propuesta o enviar el formulario a revisión.",
        "• Expulsión/Salida: El líder puede remover integrantes antes del envío final, y los integrantes pueden retirarse si así lo deciden.",
      ],
    },
    {
      num: "7. Previsualización y Generación del PDF para Impresión",
      texto: [
        "Al hacer clic en 'Vista Previa para Impresión', el sistema generará el reporte institucional A4.",
        "• El componente PDF.js procesará automáticamente todos los archivos PDF adjuntos y los insertará como imágenes PNG nítidas por página.",
        "• Use la función del navegador o el botón 'Imprimir Reporte' para generar el PDF final o imprimir en papel.",
      ],
    },
    {
      num: "8. Seguimiento de Estado y Corrección de Observaciones",
      texto: [
        "• Pendiente de Revisión: La propuesta ha sido enviada al Administrador y está bloqueada para edición temporal.",
        "• Rechazada con Observaciones: Si la propuesta es rechazada, se habilitará nuevamente el borrador y se mostrará la lista de observaciones que debe corregir antes de reenviar.",
        "• Aprobada: La propuesta cuenta con el visto bueno oficial y se le asignará un Asesor Académico.",
      ],
    },
  ];

  for (const sec of seccionesEgresado) {
    checkPageBreak(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(sec.num, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);

    for (const t of sec.texto) {
      checkPageBreak(8);
      const lines = doc.splitTextToSize(t, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 2;
    }
    y += 4;
  }

  doc.addPage();
  y = margin;
  addHeaderFooter();

  // --- PARTE II: ADMINISTRADOR ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(180, 30, 30);
  doc.text("PARTE II: GUÍA DETALLADA PARA EL ADMINISTRADOR (GESTIÓN)", margin, y);
  y += 8;

  const seccionesAdmin = [
    {
      num: "9. Acceso y Panel General Administrativo (/admin)",
      texto: [
        "Acceda con credenciales de Administrador. En la vista principal observará el resumen estadístico de propuestas pendientes, aprobadas, rechazadas, catálogo de empresas y usuarios activos.",
      ],
    },
    {
      num: "10. Módulo de Revisión, Dictamen y Asignación de Asesores (/admin/propuestas)",
      texto: [
        "1. Filtrado de Propuestas: Ingrese a /admin/propuestas y filtre por estado 'Pendientes'.",
        "2. Detalle de Propuesta: Haga clic en 'Revisar'. El sistema mostrará la información desglosada según la modalidad (Pasantía, Proyecto o Investigación).",
        "3. Aprobación: Seleccione un Asesor Académico del listado de docentes, cambie el estado a 'Aprobada' y guarde el dictamen.",
        "4. Rechazo con Observaciones: Si la propuesta tiene errores, seleccione 'Rechazada', ingrese las observaciones detalladas en el cuadro de texto y guarde. La propuesta volverá al egresado para corrección.",
      ],
    },
    {
      num: "11. Gestión de Empresas, Sucursales y Solicitudes Pendientes (/admin/empresas)",
      texto: [
        "• Solicitudes Pendientes: En /admin/empresas/solicitudes, revise las nuevas empresas enviadas por los egresados. Verifique sus datos y apruebe o rechace su incorporación al catálogo oficial.",
        "• Mantenimiento de Catálogo: Registre empresas directamente con su razón social y área. Añada sucursales asociadas especificando dirección y coordenadas en el mapa interactivo.",
        "• Ficha Impresa: Genere la ficha oficial de empresa e impresión de sucursales.",
      ],
    },
    {
      num: "12. Mantenimiento de Usuarios y Restablecimiento (/admin/usuarios)",
      texto: [
        "• Crear Usuario: Registre nuevos egresados, asesores, administradores o personal de decanato con nombre completo, correo, carnet y rol.",
        "• Editar Perfil: Actualice datos de contacto o restablezca contraseñas en caso de olvido por parte de los usuarios.",
      ],
    },
    {
      num: "13. Gestión de Períodos Académicos (/admin/periodos)",
      texto: [
        "Cree y gestione los períodos de inscripción (ej. 'Ciclo II-2026'). Active un período para abrir la recepción de propuestas o desactívelo para cerrar la recepción institucional.",
      ],
    },
    {
      num: "14. Gestión de Facultades y Carreras (/admin/facultades)",
      texto: [
        "Administre el catálogo de facultades y carreras de UNICAES a las que pertenecen los egresados.",
      ],
    },
    {
      num: "15. Carga Masiva de Egresados mediante Archivo CSV (/admin/csv)",
      texto: [
        "Para matricular lotes grandes de egresados, ingrese a /admin/csv, descargue la plantilla estándar, cargue el archivo formateado en UTF-8 y ejecute la importación automática.",
      ],
    },
  ];

  for (const sec of seccionesAdmin) {
    checkPageBreak(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(sec.num, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);

    for (const t of sec.texto) {
      checkPageBreak(8);
      const lines = doc.splitTextToSize(t, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 2;
    }
    y += 4;
  }

  const outputPath = path.join(process.cwd(), "MANUAL_DE_USUARIO_EGRESADOAPP.pdf");
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log(`Manual de Usuario PDF generado en: ${outputPath}`);
}

generateManualPDF().catch((err) => {
  console.error("Error generando Manual de Usuario PDF:", err);
});
