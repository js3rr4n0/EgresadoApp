# Entrega I5: informes de investigación (12-nov-2026)

Ruta: [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md). Entrega anterior: [I4](ENTREGA_I4.md).

## Parte 1: informe del período (hecha; commit 5a0f3ba)

- **Sección 2, cronograma.** Sin presupuesto, la sección se llama "Cronograma de actividades del período" y marca los subperíodos, sin montos ni Total.
- **Sección 5, resultados por actividad.** Con documento solicitado, la tabla tiene las columnas actividad, macroactividad, documento solicitado, resultado y anexo.
- Se probó con las propuestas 71 (investigación) y 70 (proyecto).

## Parte 2: informe final por capítulos (hecha; probada en el navegador)

**Respuestas del 12-nov:**
1. Participan **todos** los integrantes en todo el proceso.
2. Se hace "lo más ideal": el asesor revisa por capítulo y después aprueba el documento completo.
3. Se mantiene el formato del documento final de pasantía y proyecto. En la reunión se confirma si hay reglas propias.

### Qué se hizo

**Ficha:**
- etapa `informe_final` (solo investigación; va al final) con:
  - revisión por capítulo o del documento completo;
  - ratificación;
  - plazo en días hábiles;
- precarga desde la propuesta, el protocolo o el **marco teórico registrado en las actividades**;
- plantilla con los 17 capítulos del contexto;
- validación (orden, ids únicos entre etapas, fuentes de precarga) y comparación de versiones;
- pestaña **Informe final** en el constructor.

**Nada se pierde** (`actions/informeFinalFicha.ts`, tablas de `crear_informe_final_ficha.ts`):
- **Versiones.** Cada guardado, manual o **automático cada 20 s**, es una fila nueva de `versiones_capitulo`, con su autor. Nunca se actualiza ni se borra una versión.
- **Conflictos.** El guardado lleva la versión sobre la que se escribió. Si otro integrante guardó antes, la unicidad de la base rechaza el guardado y aparece un panel con su versión. El texto propio queda en pantalla, con dos opciones: "Guardar mi texto como versión nueva" o "Cargar su versión".
- **Aviso** de quién está editando el capítulo (2 minutos).
- **Aviso al salir** con cambios sin guardar.
- **Historial** con autor, fecha y palabras. "Volver a esta versión" crea una versión nueva con ese contenido.
- **Bloqueos.** Lo enviado, aprobado o entregado no se edita. La entrega guarda la **huella** de la versión completa.

**Flujo:**
1. Cualquier integrante redacta y envía capítulos.
2. El asesor aprueba u observa cada capítulo.
3. Con todo aprobado, **todos ratifican** la versión completa y el líder la **entrega**: queda congelada y empieza a correr el plazo en días hábiles.
4. El asesor la **aprueba** o la **devuelve**, siempre con un dictamen escrito. Si la devuelve, todos los capítulos quedan con observaciones.

**Exportación, con el formato del documento final:**
- **Vista para imprimir y PDF**, para el egresado y el asesor: portada, autoridades académicas, índice, apartados en mayúsculas, bibliografía con sangría francesa y anexos con las evidencias numeradas.
- **Word** (`/api/informe-final/[id]/word`) con los mismos estilos de `lib/informeWord.ts`: carta, márgenes de 3 cm y 2.54 cm, Times 12, interlineado 1.5, portada y autoridades sin número, e índice que Word actualiza al abrir. El archivo se llama "_borrador" mientras no se entrega.

**Entradas:**
- el menú del egresado, "Informe final";
- el botón "Informe final" en la pantalla de ejecución, para el equipo y el asesor.

### Pruebas

- **Comprobaciones:** `verificar_fichas.ts` pasa **150**, 19 de ellas nuevas (sección 15: la etapa, 6 errores detectados, la precarga, la edición, el aviso de edición y los pendientes). `tsc` y `eslint` están limpios.
- **Versión 2 de INV-ING-001:** se creó en el constructor con el informe final (17 capítulos, sin problemas) y se habilitó. La propuesta 71 se ligó a ella con el atajo `--usar-version-vigente`.
- **En el navegador, con la propuesta 71:**
  1. **Precarga:** la introducción viene del protocolo, y el marco teórico viene del registro de la actividad 1.1.1.1, con su cita.
  2. **Guardado automático:** a los 20 s guardó la versión 1.
  3. **Conflicto:** se simuló que Integrante Uno guardaba la versión 2. El guardado del líder mostró el conflicto sin perder su texto. "Guardar mi texto como versión nueva" creó la versión 3, y el historial mostró las 3 versiones con sus autores.
  4. **Restaurar:** "Volver a esta versión" (la 2) creó la versión 4.
  5. **Envío del capítulo:** quedó bloqueado. El asesor vio "Revisión del capítulo… (versión 4)" y lo aprobó. Los demás capítulos se llenaron y aprobaron con el atajo `--completar-informe-final`.
  6. **Exportación:** el Word se descarga (.docx válido). La vista para imprimir tiene la portada, las autoridades, el índice, los capítulos, la bibliografía y el Anexo 1.
  7. **Ratificación y entrega:** los 3 integrantes ratificaron. "Entregar" estuvo deshabilitado hasta la última firma. Después de entregar, el informe quedó congelado con su huella y con la revisión final a más tardar el 19-nov.
  8. **Aprobación:** el asesor aprobó con dictamen escrito y el estado quedó en "Aprobado por el asesor".
  9. **Hidratación:** se corrigió un error que causaba el formato de fecha según el idioma; ahora se usa un formato propio.
- `verificar_flujo_proyecto.ts`: "Flujo coherente" para la 71 y para la 70.

### Pendiente o para la reunión

- **Formato:** confirmar si el documento final de investigación tiene reglas propias, por ejemplo agrupar la metodología en un capítulo con subapartados.
- **Devolución por capítulo:** hoy "devolver" marca todos los capítulos con observaciones.
- **Eventos en el verificador:** `verificar_flujo_proyecto.ts` todavía no revisa el informe final; queda para I6.
