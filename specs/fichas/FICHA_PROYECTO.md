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

> Las respuestas a las preguntas 1 a 5 llegaron el 5-nov en el documento "Ejemplo para plantilla proyecto". Están en la sección 5.

**Pueden esperar, porque tienen un valor por defecto razonable:**

6. **Carta de aceptación del proyecto.** ¿Mantiene los +21 / +150 días? ¿Quién la emite: la institución beneficiaria? Por defecto, igual que hoy.
7. **Hitos del proyecto.** ¿Primer contacto y visita del asesor, como en la pasantía? ¿Los mismos dictámenes previos? Por defecto: primer contacto sí, visita no.
8. **Si un integrante se retira durante la ejecución,** ¿qué pasa con sus actividades? Por defecto, se reasignan a otro integrante con aprobación del asesor.
9. **Notificaciones.** ¿Todos los integrantes reciben los avisos de la propuesta, o solo el líder? Por defecto, todos.
10. **Cierre y presentaciones del proyecto.** Para una reunión posterior.

## 5. Contexto recibido (5-nov): qué cambia respecto a la pasantía

**Criterio general:** la ficha de proyecto se arma con el **mismo constructor y la misma lógica** que la de pasantía (espacios, reglas, hitos, períodos, línea de tiempo, vista del egresado, diseño "Próximamente" para lo que venga después), pero más completa. Los formatos de documento, las portadas y el informe final se mantienen; solo cambian los datos que dicen "pasantía".

| Tema | Pasantía (hoy) | Proyecto (nuevo) |
|---|---|---|
| Propuesta | Su propio flujo | **Los 8 pasos actuales son correctos.** Redacta el líder; los demás leen y ratifican. |
| Equipo | Individual | De 1 a 3 integrantes. **Misma cohorte, obligatorio.** Distintas carreras: probablemente sí, por confirmar. |
| Plan de trabajo | Cronograma plano dentro de la propuesta: actividades por período y semana | **Etapa propia después de la propuesta aprobada.** Cronograma jerárquico (ver el detalle debajo de la tabla). |
| Presupuesto | No existe | El cronograma es también la tabla de presupuesto. Cada actividad lleva su monto en los subperíodos en que se ejecuta. Cada nivel **suma automáticamente** los montos de sus hijos, por período. |
| División del trabajo | No aplica | Hay un plan **general** y uno **individual por integrante**. El individual es el mismo plan filtrado por responsable. Se recomienda que cada integrante tenga al menos 3 objetivos específicos con sus macroactividades y actividades. |
| Reparto equitativo | No aplica | **No lo valida el sistema.** Lo revisa el asesor al aprobar el plan. El sistema solo debe mostrarle la carga de cada integrante (cantidad de objetivos, actividades y montos) para que decida. |
| Validación del plan | Dictamen del plan antes de iniciar | Lo valida el supervisor de la institución. Queda documentado en el **informe de primer contacto** del asesor. |
| Ejecución | Registra el egresado | **Todos participan por igual:** cada integrante registra las actividades de **su** plan individual. |
| Períodos | 4 informes de 30 días, con subperíodos | Informes mensuales, **5 por defecto**, y todo se configura en la ficha (períodos, días y subperíodos). Puede durar menos de 150 días. |
| Métrica y balance | Páginas mínimas, palabras e imágenes obligatorias | **No aplican:** no hay mínimo de páginas, las imágenes y tablas son opcionales y el marco teórico es opcional, por actividad. |
| Informe de período | Uno por egresado | **Uno individual por integrante, y con ellos se arma un informe general del período.** Así en los 5 informes. |
| Informe final | Compilado | Compilado, igual que hoy. |
| Hitos | Dictámenes, primer contacto y visita | Se crean en la ficha igual que hoy. El ejemplo muestra la visita del asesor entre los informes 3 y 4, pero los hitos reales aún no están definidos. |

**Niveles del plan jerárquico:**

```
1        Objetivo general
1.1        Objetivo específico
1.1.1        Macroactividad
1.1.1.1        Actividad
1.1.1.1.1        Subactividad (opcional)
```

Rige la **consecuencia lógica**: cada actividad pertenece a una macroactividad, que pertenece a un objetivo específico, que pertenece al objetivo general.

**Partes del informe de período del proyecto,** según el ejemplo. Su redacción exacta se revisará después.

1. **Portada:** la de la pasantía, con los datos adaptados.
2. **Generalidades** de la empresa o institución.
3. **Cronograma y presupuesto del período:** la porción del cronograma individual que cae en el período, con los montos solo en las actividades ejecutadas.
4. **Informe de avances:** por cada nivel del plan:
   - el porcentaje de avance;
   - la fecha esperada de finalización;
   - una narración del resultado de cada macroactividad y actividad, con las acciones realizadas.
5. **Resultados obtenidos:** una tabla con el estado de cada nivel (finalizada o avance parcial) y su porcentaje concluido y pendiente.
6. **Resultados por actividad,** cada uno con su anexo.
7. **Anexos.**

**Variantes que se preguntarán después:** el tipo de proyecto (para una empresa o para la universidad, como el que solo entrega el informe final) y si habrá fichas especiales para una sola persona. **No bloquean:** la ficha ya permite variar las etapas, los períodos y los informes.

## 6. Ruta de trabajo propuesta

Cada entrega es un commit y se prueba sobre `dev-fichas`. La entrega P0 va primero porque varias correcciones afectan al equipo.

> **Avance:** P0 y P1 están hechas ([ENTREGA_P0_P1.md](ENTREGA_P0_P1.md)). P2 también ([ENTREGA_P2.md](ENTREGA_P2.md)), P3 ([ENTREGA_P3.md](ENTREGA_P3.md)) P4 ([ENTREGA_P4.md](ENTREGA_P4.md)) y P5 ([ENTREGA_P5.md](ENTREGA_P5.md)).

| # | Entrega | Qué incluye | Resultado visible |
|---|---|---|---|
| **P0** | **Correcciones previas** | Ver el detalle debajo de la tabla. | Un equipo de prueba válido de 3 personas. |
| **P1** | **Constructor: ficha de proyecto completa** | Ver el detalle debajo de la tabla. | Se crea **PRO-ING-00x** en el constructor y se ve completa en la vista del egresado. |
| **P2** | **La propuesta usa la ficha** | Nueva columna `propuestas.ficha_version_id` (solo se agrega). `initPropuesta` toma la versión habilitada que corresponde. El asistente de 8 pasos lee títulos, ayudas y reglas de la ficha (por ejemplo, los objetivos mínimos), reutilizando los formularios actuales. | Un equipo redacta, ratifica y envía una propuesta con la ficha nueva. |
| **P3** | **Plan de trabajo del equipo** | Ver el detalle debajo de la tabla. | El asesor aprueba un plan general con 3 planes individuales. |
| **P4** | **Ejecución en equipo** | Quitar los bloqueos "solo pasantía" cuando la ficha tenga ejecución. Cada integrante registra **sus** actividades (avance, resultado, acciones, anexos y, si quiere, marco teórico), con las reglas de la ficha. El asesor revisa y ve quién hizo qué. | Cada integrante trabaja en su parte; el asesor ve al equipo completo. |
| **P5** | **Informes de período** | Un informe individual por integrante y el general del período, con sus partes: cronograma y presupuesto del período, avances, resultados y anexos. Prioridad baja en la redacción, según la nota del documento. | Los informes 1 a 5 del equipo. |
| **P6** | **Prueba completa y documentación** | El recorrido de punta a punta con 3 integrantes, una lista de comprobación del flujo y el documento de referencia para las demás modalidades. | El flujo de referencia. |

**P0, correcciones previas:**
- el desfase de fechas del cronograma (O2);
- las cohortes activas (O4);
- validar la **misma cohorte** al invitar y al aceptar;
- tomar el límite del equipo de la ficha, no el 3 escrito a mano (H2);
- notificar a todos los integrantes (H3);
- verificar en el servidor al dar inicio (H4).

**P1, constructor.** Mismo diseño que la ficha de pasantía:
- **Nueva etapa "Plan de trabajo",** entre la propuesta y la ejecución. Sus reglas son:
  - los niveles, con la subactividad opcional;
  - si lleva presupuesto;
  - en qué nivel se asigna el responsable (objetivo específico o actividad);
  - el mínimo de objetivos específicos por integrante;
  - quién aprueba.
- **Ejecución:**
  - permitir "sin mínimo" en páginas, palabras e imágenes;
  - el marco teórico opcional;
  - el informe "individual y general".
- **PRO-BASE** se actualiza con 5 informes. Los hitos se configuran en el editor actual.
- Validaciones nuevas.

**P3, plan de trabajo del equipo:**
- **Tablas nuevas** (solo se agregan): un nodo del plan con su padre, nivel, código, título y responsable, y los montos de cada nodo por período y subperíodo.
- **Editor jerárquico** con sumas automáticas y vista general o individual.
- **Panel de carga por integrante** para el asesor.
- **Envío y aprobación:** el asesor aprueba y el dictamen del plan queda como requisito antes de iniciar.

**Por qué tablas nuevas para el plan:** la tabla `actividades` de la pasantía guarda una actividad por celda (período, semana y número). No tiene jerarquía, ni montos, ni actividades que abarquen varias semanas. Forzarla pondría en riesgo la pasantía, que ya funciona. El plan de proyecto vive aparte, y la pasantía no se toca.

**Alcance sugerido para la próxima reunión:** P0, P1 y P2 completos, y P3 funcionando, aunque sea sin el panel de carga. Eso demuestra que la ficha se crea, que el equipo la usa y que el trabajo se divide entre los integrantes. P4 y P5 pueden mostrarse como diseño ("Próximamente") si no alcanza el tiempo.

## 7. Preguntas que quedan

Estas preguntas afectan al diseño de P1 y P3.

1. **¿Cuántos objetivos específicos?** La propuesta pide de 4 a 6 en total, pero el plan recomienda al menos 3 por integrante (9 para un equipo de 3). ¿El mínimo debe depender del tamaño del equipo, por ejemplo 3 × integrantes? ¿O el plan puede agregar objetivos que no estaban en la propuesta?
2. **¿El responsable se asigna por objetivo específico?** Si es así, todo lo que cuelga de él es del mismo integrante. ¿O puede haber actividades de distintos integrantes dentro de un mismo objetivo?
3. **¿El presupuesto es un monto por subperíodo o hay que separar recursos y gastos?** En el ejemplo hay columnas S1 a S4 dentro del mes. El documento habla de "recursos y gastos".
4. **¿Quién redacta y envía el informe general del período?** ¿Se arma solo con los individuales, o el líder redacta partes como las generalidades y la conclusión? ¿El asesor aprueba cada individual y luego el general?
5. **¿El registro de la ejecución es por actividad o por subperíodo?** ¿Hay un registro por actividad con su porcentaje de avance, que se actualiza en cada período? ¿O es como en la pasantía, un registro por cada subperíodo?

Sin estas respuestas se puede empezar con valores por defecto, que se cambian después en la ficha sin rehacer nada:
1. un mínimo de 3 objetivos específicos por integrante;
2. el responsable asignado por objetivo específico;
3. un solo monto por subperíodo;
4. el general se arma con los individuales y el líder lo envía;
5. un registro por actividad, con su avance en cada período.
