# Entrega I2: la propuesta de investigación usa la ficha (12-nov-2026)

Ruta: [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md). Entrega anterior: [ENTREGA_I1.md](ENTREGA_I1.md).

## Respuestas aplicadas (12-nov)

- **Q2. No se agrega alcance.** La investigación sigue sin ese paso.
- **Q3. La descripción narrativa ya existe.** Es la descripción que lleva cada objetivo en el paso "Objetivos", así que se quitó de INV-ING-001 el bloque de texto que se había agregado en I1.
- **Q4. El plan de investigación no lleva presupuesto.** Así viene en `planNuevo("…", "investigacion")` y en INV-ING-001.
- **Q5. La matriz de hipótesis queda con Hipótesis, Variables e Indicadores** hasta la reunión.

## Qué se hizo

**1. Las investigaciones nuevas reciben una ficha.**
- `MODALIDADES_CON_FICHA = ["proyecto", "investigacion"]`, en `lib/fichas/fichaDePropuesta.ts`.
- `initPropuesta` asigna la versión habilitada más específica para el egresado: su carrera, luego su facultad, luego la general.

**2. Un solo asistente para proyecto e investigación** (`egresado/redactar/page.tsx`):
- **Se retiraron los 7 pasos escritos a mano.** Los pasos, su orden, el desbloqueo y el paso al que vuelven los ajustes del asesor salen de la ficha.
- **Las propuestas sin ficha** (43, 48, 51 y 69) usan `INV-BASE`, que reproduce los mismos 7 pasos de antes.
- **Los formularios reciben `isInvestigacion`.** Así conservan "Investigador", "de la Investigación" y el formulario de actores sin ejecutor.
- **El paso Actores se da por completo con los actores que pide la ficha.** Antes se exigían siempre los 4; investigación no pide el ejecutor.
- **Textos de navegación:**
  - "← Paso anterior" cuando el orden lo da la ficha. Antes decía, por ejemplo, "Volver a Actores" aunque el paso anterior fuera la Portada.
  - "Líder de la investigación" en la tabla del equipo.
  - "Propuesta de Investigación (Equipo de …)" en el panel del integrante.
  - El ejemplo del objetivo general ya no dice "proyecto".

**3. Lo que ya era genérico y se reutiliza sin cambios:**
- el límite del equipo y los objetivos según la ficha;
- la validación de los espacios nuevos al enviar;
- las respuestas de los espacios;
- la huella de la ratificación.

**4. Datos de prueba:** `scripts/fichas/sembrar_equipo_investigacion.ts`.
- Crea la cohorte PRUEBA-INV-2026 y a inv.lider, inv.integrante1 e inv.integrante2. Los dos primeros son de Ingeniería en Sistemas; inv.integrante2 es de **Ingeniería en desarrollo de software**, para probar el equipo de distintas carreras.
- Admite `--borrar` y `--aprobar`; `--aprobar` sirve para I3.

**5. `verificar_flujo_proyecto.ts`** acepta las propuestas de investigación. El cambio de nombre a `verificar_flujo.ts` queda para I6.

## Pruebas

- `verificar_fichas.ts`: 118 comprobaciones; la nueva revisa que la investigación no lleve presupuesto. Todas pasan.
- `tsc` limpio. `eslint` no muestra errores nuevos: los que salen en `redactar/page.tsx` y `ProyectoPortadaForm.tsx` (`any` y `static-components`) ya estaban.

**En el navegador (`dev-fichas`):**
1. El admin quitó el bloque narrativo y el presupuesto de INV-ING-001 y **habilitó la versión 1**.
2. **inv.lider** creó la propuesta **71**, que quedó ligada a **INV-ING-001-SIST v1**. El asistente muestra los 7 pasos en el orden de la ficha: Portada, Carta, Problema, Justificación, Objetivos, Actores y Documentos.
3. El líder invitó a los dos integrantes, incluido el de **otra carrera**, sin error. Llenó:
   - la carta, con un PDF de prueba;
   - el problema y la justificación;
   - los objetivos: el general y 4 específicos con su descripción;
   - los actores: patrocinador, investigador y financista, sin ejecutor.
4. Con eso se habilitaron los 7 pasos.
5. Los integrantes aceptaron y ratificaron, y el líder ratificó.
   - El primer intento de envío se rechazó con "RATIFICACION_INCOMPLETA", y es lo correcto. La huella incluye a los integrantes aceptados: integrante 2 había firmado antes de que integrante 1 aceptara, así que su firma ya no correspondía a la versión.
   - Integrante 2 volvió a firmar y el envío pasó: la propuesta 71 quedó **enviada**.
6. `verificar_flujo_proyecto.ts 71`: "Flujo coherente". La propuesta 70 (proyecto) sigue en "Flujo coherente", con 1 aviso.

## Pendiente

- **I3. Protocolo y plan de trabajo:**
  - aprobar la 71 con `sembrar_equipo_investigacion.ts --aprobar`;
  - la redacción del protocolo, con la precarga y el formulario de la tabla, y su ratificación;
  - el dictamen del asesor en días hábiles;
  - el plan con el documento solicitado.
- **Vistas de revisión y PDF de la propuesta.** Siguen con sus secciones fijas de la fase 1. En investigación muestran lo mismo que antes, porque INV-ING-001 no tiene espacios nuevos en la propuesta.
- **Dudas abiertas:** Q5 (columnas definitivas y quién redacta el protocolo), Q6, Q7 y Q8.
