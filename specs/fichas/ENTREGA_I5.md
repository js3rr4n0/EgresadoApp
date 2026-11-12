# Entrega I5: informes de investigación (12-nov-2026)

Ruta: [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md). Entrega anterior: [I4](ENTREGA_I4.md).

## Parte 1: informe del período (hecha)

Son cambios en `InformePeriodoProyecto.tsx`. Salen de la ficha, no de la modalidad.

**2. Cronograma del período**
- Si el plan **no lleva presupuesto**, como en investigación:
  - la sección se titula "Cronograma de actividades del período";
  - cada celda marca el subperíodo en que se ejecuta la actividad, con una barra en lugar de un monto;
  - no hay columna Total.
- Con presupuesto, como en proyecto, la sección sigue igual.

**5. Resultados por actividad**
- La tabla ahora tiene encabezados.
- Si la ficha pide el **documento solicitado**, la tabla sigue el ejemplo del contexto:
  - actividad;
  - macroactividad / actividad;
  - **documento solicitado**, el que el egresado escribió en el plan (una subactividad usa el de su actividad);
  - resultado;
  - anexo, con un enlace a la evidencia numerada.
- En proyecto, la tabla tiene las columnas actividad, descripción, resultado y anexo.

**Prueba en el navegador (`dev-fichas`):**
- **Propuesta 71, informe individual del período 1:**
  - la sección 2 dice "Cronograma de actividades del período", sin montos ni Total;
  - la sección 5 muestra "1.1.1.1 · 1.1.1 Macroactividad de prueba · Cuestionario aplicado a estudiantes (PDF) · resultado · Ver Anexo 1".
- **Propuesta 70, informe general del período 1:** sigue con "Cronograma y presupuesto", los montos y el Total.
- `tsc` y `eslint` limpios.

## Parte 2: informe final por capítulos (pendiente de confirmar)

La propuesta, con los cuidados para la tesis, está en FICHA_INVESTIGACION.md §7. Antes de construirlo hay que responder tres preguntas:

1. ¿Redactan todos los integrantes, cada uno sus capítulos, o solo el líder?
2. ¿El asesor revisa capítulo por capítulo o el documento completo?
3. ¿Hay un formato institucional (márgenes, fuente, APA 7) que el PDF y el Word deban respetar?
