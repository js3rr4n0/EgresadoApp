# Ficha de PROYECTO: preparación (5-nov-2026)

**Encargo para la próxima reunión:** elaborar el flujo completo de una ficha de proyecto. Empieza en el constructor, con los elementos de un proyecto, y termina con un egresado (o un equipo) usándola. El flujo debe probar que el trabajo en equipo se divide correctamente, y servirá de referencia para las demás modalidades.

Este documento revisa lo que ya hace la fase 1, señala lo que falta y lista la información que hace falta para desarrollarlo.

## 1. Lo que ya existe en la fase 1

Sí: el proyecto llega solo hasta la **propuesta y su aprobación**. No tiene cronograma, ni seguimiento de actividades, ni informes.

| Etapa | Qué hace hoy | Dónde |
|---|---|---|
| Crear la propuesta | El egresado elige "Proyecto" y queda como **líder**. | `actions/propuestas.ts` (`initPropuesta`) |
| Equipo | Ver el detalle debajo de esta tabla. | `actions/proyecto.ts`, `components/proyecto/ProyectoPortadaForm.tsx` |
| 8 pasos | Portada (con equipo), Actores (4), Carta de aceptación (+21 / +150 días), Problema, Justificación, Alcance, Objetivos (4 a 6 específicos), Documentación. | `egresado/redactar/page.tsx` |
| Quién edita | Solo el líder. Los integrantes ven en **solo lectura**. | `isReadOnly={!isLeader}` |
| Ratificación | Cada integrante "ratifica" la versión actual. Se guarda una huella (hash) del contenido; si alguien cambia algo, las firmas anteriores dejan de valer. | `ratificarPropuesta`, `getPropuestaVersionHash` |
| Documentos | Cada integrante sube sus 3 documentos (servicio social, notas y pago) en su propio panel. | `documentos_egresado` |
| Envío | El líder envía. *Ver el hallazgo H1.* | `DocumentosEstudianteForm` |
| Revisión | Admin → coordinador → asesor, igual que en pasantía. Si el asesor pide ajustes, la propuesta vuelve al paso 7 (Objetivos). | |
| Aprobación | El coordinador sube **3** documentos (sin plan de trabajo firmado) y da inicio. | `getRequiredDocsForTipo`, `darInicioPlanTrabajo` |
| Después de "dar inicio" | Pasa a `en_ejecucion`, pero **no hay nada que hacer**. El registro de actividades, los informes y la visita están bloqueados para todo lo que no sea pasantía. | `registrosActividad.ts:108`, `informesMensuales.ts:69`, `informeVisita.ts:65` |

**Detalle del equipo:**
- El líder invita por carnet o correo, y el invitado acepta o rechaza.
- Hay un máximo de 3 personas, contando las invitaciones pendientes.
- Un egresado solo puede estar en un equipo o en una propuesta a la vez.
- El líder puede expulsar a un integrante, y un integrante puede salirse.
- El líder puede transferir el liderazgo.

**Datos de prueba en `dev-fichas`:** hay proyectos en borrador (45, 50, 68) y uno con coordinador asignado (49). Ninguno tiene equipo. El único equipo es la investigación 51, de Jonathan y Wendy.

## 2. Hallazgos en el código actual

Afectan directamente a este flujo.

- **H1. El envío no verifica al equipo** (es grave). El botón "Mandar propuesta" llama a `enviarPropuesta` de `actions/justificacion.ts`. Esa función solo cambia el estado:
  - no revisa que todos hayan ratificado;
  - no revisa que cada integrante tenga sus documentos;
  - ni siquiera revisa que quien envía sea el dueño de la propuesta.

  La versión correcta (`actions/propuestas.ts`, que usa `verificarCapacidadEnvio`) existe, pero ninguna pantalla la usa. Explica por qué la prueba E5 de la lista de regresión no se podía cumplir.
- **H2.** El límite de 3 integrantes está escrito a mano en dos lugares (`invitarIntegrante` y `responderInvitacion`). Debe salir de la ficha (`participantes.max`).
- **H3.** Las notificaciones van **solo al líder**, por ejemplo al dar inicio al plan. Los integrantes no se enteran.
- **H4.** `darInicioPlanTrabajo` no verifica en el servidor ni el estado de la propuesta ni que estén los documentos de aprobación.
- **H5. No hay forma de dividir el trabajo:** las actividades, sus registros y los informes no tienen un "responsable" por integrante. La huella de ratificación ya incluye las actividades, así que la fase 1 sí pensaba en un cronograma para el proyecto.
- **H6.** El paso 8 (Documentación) muestra solo los documentos del líder y está bloqueado para los integrantes. Funciona porque cada quien sube los suyos en su panel, pero no se ve el estado del equipo completo en un solo lugar.

## 3. Flujo propuesto para la ficha de proyecto

```
Constructor (admin)                      Egresado / equipo
───────────────────                      ─────────────────
1. Ficha PRO-…  ── habilitada ──►  2. El líder crea su proyecto con esa ficha
   · propuesta (espacios)                3. Invita a sus integrantes (máx. según la ficha)
   · cronograma con responsable          4. Redacta los espacios de la ficha
   · ejecución (períodos, hitos)         5. Arma el cronograma: cada actividad con su responsable
                                            y el reparto validado según la regla de la ficha
                                         6. Todos ratifican → envío (con H1 corregido)
                                         7. Revisión y aprobación (igual que hoy)
                                         8. Ejecución: cada integrante registra SUS actividades;
                                            el asesor revisa; el informe del período junta al equipo
```

**Qué implica en el código:**
- **Constructor:** el cronograma se habilita para proyecto (hoy solo es para pasantía) y se activan "Responsable por actividad" y una regla de reparto.
- **Conexión con la ficha:**
  - nueva columna `propuestas.ficha_version_id` (solo se agrega);
  - el asistente toma los pasos, su orden y sus reglas de la ficha, reutilizando los formularios que ya existen;
  - los límites de equipo salen de la ficha.
- **Cronograma con responsable:** nueva columna `actividades.responsable_id` (solo se agrega), selector de integrante en cada actividad y validación del reparto.
- **Ejecución para proyecto:** quitar los bloqueos "solo pasantía" cuando la ficha tenga ejecución. Cada integrante registra las actividades a su nombre, y el asesor ve quién hizo qué.
- **Correcciones previas,** en commits separados:
  - H1;
  - el desfase de fechas del cronograma (O2);
  - las cohortes activas (O4);
  - las pruebas pendientes de la pasada 1.

## 4. Información que falta

**Indispensables para empezar esta semana:**

1. **Elementos de la propuesta de proyecto.** ¿Los 8 pasos actuales son los correctos? En concreto:
   - ¿se agrega un **cronograma o plan de trabajo con actividades**?
   - ¿falta algo, como metodología, entregables o productos, o presupuesto?
2. **Tamaño del equipo.** ¿Mínimo y máximo de integrantes? Hoy es de 1 a 3.
   - ¿Se permite hacer el proyecto individual?
   - ¿Los integrantes deben ser de la misma carrera o cohorte?
3. **Cómo se divide el trabajo en grupo.**
   - ¿Cada actividad tiene **un** responsable, o puede ser compartida?
   - ¿Qué significa "reparto equitativo"? Por ejemplo: mismo número de actividades por integrante en cada período, una diferencia máxima de 1, o un mínimo por integrante.
   - ¿Cada integrante redacta y registra **sus** actividades durante la ejecución?
4. **La ejecución del proyecto.**
   - ¿Existe, con qué duración y en cuántos períodos y subperíodos?
   - El prototipo suponía 4 períodos de 21 días con 3 subperíodos; ¿es correcto?
   - ¿El registro de cada actividad es igual al de pasantía (marco teórico con cita, 200–300 palabras, imágenes y conclusión)?
5. **Informes del período en equipo.** ¿Uno solo por equipo, que junta las actividades de todos, o uno por integrante?
   - ¿Cuántas páginas mínimas? ¿Se cuentan por equipo o por persona?

**Pueden esperar, porque tienen un valor por defecto razonable:**

6. **Carta de aceptación del proyecto.** ¿Mantiene los +21 / +150 días? ¿Quién la emite: la institución beneficiaria? Por defecto, igual que hoy.
7. **Hitos del proyecto.** ¿Primer contacto y visita del asesor, como en la pasantía? ¿Los mismos dictámenes previos? Por defecto: primer contacto sí, visita no.
8. **Si un integrante se retira durante la ejecución,** ¿qué pasa con sus actividades? Por defecto, se reasignan a otro integrante con aprobación del asesor.
9. **Notificaciones.** ¿Todos los integrantes reciben los avisos de la propuesta, o solo el líder? Por defecto, todos.
10. **Cierre y presentaciones del proyecto.** Para una reunión posterior.
