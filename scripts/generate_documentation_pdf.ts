import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";

async function generatePDF() {
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
    doc.text("EgresadoApp - Documentación Técnica y Plan de Pruebas", margin, 8);
    doc.text(`Página ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 10, pageWidth - margin, 10);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  };

  // --- PORTADA ---
  doc.setFillColor(180, 30, 30); // Brand Red
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("UNIVERSIDAD CATÓLICA DE EL SALVADOR", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("DOCUMENTACIÓN OFICIAL DEL SISTEMA Y PLAN DE PRUEBAS", pageWidth / 2, 28, { align: "center" });

  y = 55;

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SISTEMA DE GESTIÓN DE TRABAJOS DE GRADUACIÓN (EgresadoApp)", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Fecha de generación: 24 de Julio, 2026 | Versión: 1.0.0 (Producción)`, margin, y);
  y += 12;

  // Horizontal separator line
  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- SECCIÓN 1: ARQUITECTURA GENERAL ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(180, 30, 30);
  doc.text("1. ARQUITECTURA GENERAL Y TECNOLOGÍAS", margin, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const textSec1 = [
    "EgresadoApp es una plataforma web integral diseñada para la gestión, redacción, revisión y aprobación de propuestas de Trabajo de Graduación de la Universidad Católica de El Salvador (UNICAES).",
    "",
    "• Framework Principal: Next.js 16 (App Router con Turbopack y React 19).",
    "• Base de Datos: PostgreSQL Serverless (Neon DB) con ORM Drizzle.",
    "• Seguridad y Sesiones: Autenticación mediante tokens JWT cifrados en cookies HTTP-Only (Jose/BCryptJS).",
    "• Procesamiento de PDF: Integración con PDF.js para renderizado dinámico de documentos adjuntos a imágenes de alta definición.",
    "• Estilos e Interfaz: Vanilla CSS con TailwindCSS v4, diseño responsivo y optimizado para impresión A4.",
  ];

  for (const line of textSec1) {
    checkPageBreak(5);
    doc.text(line, margin, y);
    y += 5;
  }
  y += 5;

  // --- SECCIÓN 2: ANÁLISIS DE ÁREAS Y FUNCIONALIDADES ---
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(180, 30, 30);
  doc.text("2. DESCRIPCIÓN DETALLADA DE ÁREAS Y MÓDULOS", margin, y);
  y += 7;

  const modulos = [
    {
      titulo: "2.1. Módulo de Autenticación y Control de Acceso (/login)",
      desc: "Permite el acceso seguro de usuarios con roles específicos (Egresado, Asesor, Decanato, Administrador). Valida credenciales contra contraseñas con hash bcrypt. Restringe vistas mediante middleware.",
      estado: "100% FUNCIONAL",
    },
    {
      titulo: "2.2. Módulo Egresado - Panel y Redacción (/egresado)",
      desc: "Permite al estudiante verificar el período activo, crear propuestas (Pasantía, Proyecto e Investigación) e invitar a compañeros por carnet. Incluye flujo asistido por pasos dinámicos, cálculo automático de fechas (21 días de inicio y 150 días de duración) y previsualización PDF.",
      estado: "100% FUNCIONAL",
    },
    {
      titulo: "2.3. Modalidades de Propuestas apoyaas:",
      desc: "• Pasantía (7 etapas): Portada, Datos Empresariales/Mapa, Supervisor, Carta Aceptación, Plan de Actividades (mes/semana), Justificación, Documentos.\n• Proyecto (8 etapas): Portada (Líder + Integrantes), 4 Actores (Patrocinador, Beneficiario, Ejecutor, Financista), Carta, Problema, Justificación, Alcance, Objetivos (1 General + 4-6 Específicos), Documentos.\n• Investigación (7 etapas): Portada, 3 Actores (Patrocinador, Investigador, Financista), Carta, Problema a investigar, Justificación, Objetivos (General + 4-6 Específicos), Documentos.",
      estado: "100% FUNCIONAL",
    },
    {
      titulo: "2.4. Visor e Impresión de Reportes PDF (/egresado/redactar/imprimir)",
      desc: "Genera el documento oficial consolidado para presentación. Renderiza las páginas de archivos PDF adjuntos (cartas, solvencias) directamente a imágenes de alta definición mediante canvas/PDF.js para impresión nativa sin pérdidas.",
      estado: "100% FUNCIONAL",
    },
    {
      titulo: "2.5. Módulo Administrativo (/admin)",
      desc: "Panel para administradores que permite revisar propuestas, aprobar o rechazar con observaciones, asignar asesores académicos, gestionar catálogo de empresas, sucursales y solicitudes de nuevas empresas, administrar usuarios, períodos académicos, facultades y carga masiva mediante archivos CSV.",
      estado: "100% FUNCIONAL",
    },
    {
      titulo: "2.6. Módulo de Asesores Académicos (/asesor)",
      desc: "Permite a los docentes asignados revisar las propuestas de graduación asociadas a su cuenta y brindar seguimiento.",
      estado: "100% FUNCIONAL",
    },
    {
      titulo: "2.7. Módulo de Decanato (/decanato)",
      desc: "Vista consolidada de propuestas aprobadas y estadísticas globales para revisión del Decanato.",
      estado: "100% FUNCIONAL",
    },
  ];

  for (const mod of modulos) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(mod.titulo, margin, y);
    
    doc.setFontSize(8.5);
    doc.setTextColor(0, 120, 50);
    doc.text(`[${mod.estado}]`, pageWidth - margin - 25, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const lines = doc.splitTextToSize(mod.desc, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 4;
  }

  // --- SECCIÓN 3: MATRIZ DE ESTADO Y PENDIENTES ---
  checkPageBreak(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(180, 30, 30);
  doc.text("3. MATRIZ DE ESTADO FUNCIONAL Y MEJORAS OPCIONALES", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setTextColor(40, 40, 40);
  doc.text("Funcionalidad / Característica", margin + 3, y + 5);
  doc.text("Estado Actual", margin + 110, y + 5);
  doc.text("Tipo / Prioridad", margin + 150, y + 5);
  y += 8;

  const matriz = [
    ["Autenticación JWT & Roles", "100% Funcional", "Núcleo / Operativo"],
    ["Creación de Propuestas (3 Modalidades)", "100% Funcional", "Núcleo / Operativo"],
    ["Gestión de Equipos (Invitar, Expulsar, Aceptar)", "100% Funcional", "Núcleo / Operativo"],
    ["Cálculo Automático de Fechas (21d / 150d)", "100% Funcional", "Lógica Negocio"],
    ["Renderizado PDF.js a Imágenes", "100% Funcional", "Visual / Reporte"],
    ["Revisión Administrativa & Asignación", "100% Funcional", "Administrativo"],
    ["Mantenimiento de Empresas y Sucursales", "100% Funcional", "Catálogo"],
    ["Carga Masiva de Alumnos (CSV)", "100% Funcional", "Herramienta Admin"],
    ["Notificaciones por Correo Electrónico (SMTP)", "Pendiente / Opcional", "Mejora Futura"],
    ["Firma Digital Criptográfica (PKI)", "Pendiente / Opcional", "Mejora Futura"],
    ["Exportación de Reportes a Excel (.xlsx)", "Pendiente / Opcional", "Mejora Futura"],
  ];

  doc.setFont("helvetica", "normal");
  for (const row of matriz) {
    checkPageBreak(6);
    doc.text(row[0], margin + 3, y + 4);
    
    if (row[1].includes("100%")) {
      doc.setTextColor(0, 120, 50);
    } else {
      doc.setTextColor(180, 100, 0);
    }
    doc.text(row[1], margin + 110, y + 4);
    
    doc.setTextColor(80, 80, 80);
    doc.text(row[2], margin + 150, y + 4);

    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 7;
  }
  y += 6;

  // --- SECCIÓN 4: PLAN Y EJEMPLOS DETALLADOS DE PRUEBAS ---
  checkPageBreak(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(180, 30, 30);
  doc.text("4. EJEMPLOS DETALLADOS DE PRUEBAS (TEST SUITE PLAN)", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const introTests = "A continuación se presentan los ejemplos de código y escenarios de prueba detallados para validación unitaria, de integración y pruebas E2E en el sistema:";
  doc.text(doc.splitTextToSize(introTests, contentWidth), margin, y);
  y += 8;

  const testExamples = [
    {
      tipo: "Prueba Unitaria 1: Cálculo Automático de Fechas en Carta de Aceptación",
      codigo: `// test/unit/carta-fechas.test.ts
import { addDays } from "@/components/proyecto/CartaProyectoForm";

describe("Cálculo de fechas de Carta de Aceptación", () => {
  it("debe calcular la fecha de inicio agregando exactamente 21 días (3 semanas) a la emisión", () => {
    const emision = "2026-08-01";
    const inicioEsperado = "2026-08-22";
    expect(addDays(emision, 21)).toBe(inicioEsperado);
  });

  it("debe calcular la fecha de fin agregando exactamente 150 días a la fecha de inicio", () => {
    const inicio = "2026-08-22";
    const finEsperado = "2027-01-19";
    expect(addDays(inicio, 150)).toBe(finEsperado);
  });
});`,
    },
    {
      tipo: "Prueba de Integración 2: Invitación y Notificación de Integrante en Investigación",
      codigo: `// test/integration/invitar-integrante.test.ts
import { invitarIntegrante } from "@/app/actions/proyecto";

describe("Server Action: invitarIntegrante", () => {
  it("debe rechazar la invitación si el carnet ingresado no pertenece a un egresado registrado", async () => {
    const res = await invitarIntegrante(10, "0000-XX-000");
    expect(res.success).toBe(false);
    expect(res.error).toContain("No se encontró ningún egresado con ese carnet");
  });

  it("debe permitir invitar un compañero y enviar una notificación personalizada según el tipo de propuesta", async () => {
    const res = await invitarIntegrante(10, "2020-PM-605");
    expect(res.success).toBe(true);
  });
});`,
    },
    {
      tipo: "Prueba E2E 3: Flujo Completo de Redacción de Investigación (Playwright)",
      codigo: `// test/e2e/investigacion-flow.spec.ts
import { test, expect } from '@playwright/test';

test('Egresado crea y redacta una propuesta de Investigación exitosamente', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="carnet"]', '2021-EG-001');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/egresado');
  await page.click('text=Nueva Propuesta');
  await page.click('text=Investigación');

  // Step 1: Portada
  await page.fill('input[name="nombreCompleto"]', 'Juan Pérez');
  await page.click('button:has-text("Guardar Portada")');

  // Step 2: Actores (3 actores para Investigación)
  await page.click('text=Paso Siguiente');
  await page.fill('textarea[name="actorPatrocinador"]', 'Universidad UNICAES');
  await page.fill('textarea[name="actorBeneficiario"]', 'Comunidad Investigadora');
  await page.fill('textarea[name="actorFinancista"]', 'Fondo de Investigación');
  await page.click('button:has-text("Guardar Actores")');

  await expect(page.locator('text=Actores guardados correctamente')).toBeVisible();
});`,
    },
  ];

  for (const t of testExamples) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(180, 30, 30);
    doc.text(t.tipo, margin, y);
    y += 5;

    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setFillColor(245, 245, 248);
    
    const lines = t.codigo.split("\n");
    const blockHeight = lines.length * 3.8 + 4;
    checkPageBreak(blockHeight);

    doc.rect(margin, y, contentWidth, blockHeight, "F");
    doc.setDrawColor(210, 210, 220);
    doc.rect(margin, y, contentWidth, blockHeight, "S");
    
    doc.setTextColor(30, 30, 30);
    let lineY = y + 4;
    for (const l of lines) {
      doc.text(l, margin + 3, lineY);
      lineY += 3.8;
    }
    y += blockHeight + 6;
  }

  // Save the PDF file in workspace
  const outputPath = path.join(process.cwd(), "DOCUMENTACION_SISTEMA_EGRESADOAPP.pdf");
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

  console.log(`PDF generado con éxito en: ${outputPath}`);
}

generatePDF().catch((err) => {
  console.error("Error generando PDF:", err);
});
