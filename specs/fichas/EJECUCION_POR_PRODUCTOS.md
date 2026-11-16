# Ejecución por productos (notas del 13-nov-2026)

Notas del usuario sobre cómo se ejecutan los proyectos y las investigaciones. La idea central es que el asesor revisa, sobre todo, que se entreguen los **productos prometidos**:

- en cada actividad, la evidencia;
- en cada objetivo específico, sus productos y una conclusión.

Todo eso termina en el informe final. El mismo día se hizo la parte corta, con prioridad en la plantilla de investigación porque había demo. Lo demás queda para la semana siguiente.

## 1. Hecho el 13-nov-2026

| Nota | Cambio | Archivos |
| --- | --- | --- |
| Quitar el marco teórico del registro de actividad. | Las plantillas de proyecto e investigación usan `registro.marcoTeorico: "no"`.<br>El capítulo "Marco teórico" del informe final ahora se precarga del subapartado `desarrollo` de la fundamentación del protocolo (`precargarDe: "fundamentacion"`).<br>`PRECARGA_MARCO_REGISTROS` sigue disponible en el constructor para otras fichas. | `lib/fichas/plantillas.ts` |
| Fechas en que se hizo la actividad (del… al…). | Columnas `fecha_inicio` y `fecha_fin` en `registros_plan`, que crea `scripts/fichas/crear_registros_plan.ts`.<br>Son obligatorias para enviar; la final no puede ser anterior a la inicial ni posterior a hoy.<br>Se muestran en el informe del período ("Realizada del … al …") y en la tarjeta de la actividad. | `schema.ts`, `actions/ejecucionProyecto.ts`, `lib/fichas/planTrabajo.ts` (`problemasFechasRegistro`, `fechaValida`), `RegistroActividadProyecto.tsx`, `InformePeriodoProyecto.tsx`, `lib/fichas/informePeriodo.ts` |
| El avance va al final: no se pone hasta haber registrado lo que se hizo y las evidencias. | `faltaParaAvance` lista lo que falta: fechas, qué se hizo, resultado y evidencias.<br>En pantalla, el campo de avance está deshabilitado y explica qué falta.<br>El servidor descarta el avance si falta algo.<br>El registro sigue este orden: cuándo, qué se hizo, resultado, evidencias, avance. | `planTrabajo.ts`, `RegistroActividadProyecto.tsx`, `actions/ejecucionProyecto.ts` |
| La actividad no se envía sin evidencias, que deben ser el producto prometido. | Ya existía: mínimo 1 evidencia y "documento solicitado" en el plan.<br>Ahora el aviso dice: "Esto es lo que se espera: … Es el producto que se prometió en el plan de trabajo; envíelo aquí como evidencia". | `RegistroActividadProyecto.tsx` |
| Cambiar "Indique…" por "Describa qué se obtuvo…". | Hecho. La tarjeta "Acciones realizadas" pasó a llamarse "¿Qué se hizo?". | `RegistroActividadProyecto.tsx` |
| Ver "Mi avance" y el de los otros miembros en el cronograma. | El cronograma tiene un selector: Todo el equipo, Mi avance o cada integrante. Al elegir a alguien se calcula con `planIndividual`, es decir, el avance solo sobre su parte.<br>Las tarjetas por integrante muestran el avance de su parte, además de las actividades enviadas y aprobadas. | `EjecucionProyecto.tsx` |
| Ya no hacen falta informes individuales. | Las plantillas usan `informe.modo: "unico"`, un solo informe general.<br>El constructor conserva la opción "individual y general". | `plantillas.ts` |

### Pruebas y datos en dev-fichas

- **verificar_fichas:** 216 comprobaciones; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **INV-ING-001 v5** (id 15):
  - creada con `sembrar_equipo_investigacion.ts --version-ejecucion` a partir de la v4;
  - habilitada desde el constructor.
- **Propuesta 73** (inv.apartados@prueba.test) se ligó a la v5. En ella:
  - la actividad 1.1.1.1 del período 1 está enviada con fechas, una evidencia (enlace) y avance del 100 %;
  - la ejecución muestra 25 %.
- **Propuesta 71** (equipo inv.lider) sigue en la v2. Sirvió para probar el selector del cronograma: Mi avance 33 %, el equipo 11 %.

## 2. Para la semana siguiente

1. **Productos por objetivo específico.**
   - **En el plan:** cada objetivo específico declara sus productos esperados. Ejemplo: "Estudio de tiempos", "Documento de análisis de flujo", "Listado de levantamiento técnico".
   - **Habilitación:** cuando todas las actividades del objetivo llegan al 100 %, se habilita "Entregar productos del objetivo", con archivos y una **conclusión del objetivo**.
   - **Revisión:** el asesor revisa contra lo prometido.
   - **Calendario:** no hay fecha fija. Puede haber meses sin productos o con dos.
   - **Lo que queda en el informe final:** las conclusiones por objetivo.
2. **Resultados del informe final ordenados por objetivo.**
   - El capítulo de resultados se arma solo en este orden: objetivo general, objetivo específico 1 con sus productos, sus macroactividades con sus evidencias (siempre con el índice de la actividad), y así con los demás.
   - El capítulo de conclusiones parte de las conclusiones por objetivo.
3. **Bitácora o "reporte de modificaciones".**
   - Un texto opcional en cada actividad y objetivo para registrar cambios de recursos, tiempo o alcance, problemas o trabajo extra.
   - Pasa solo, en orden y con el índice de la actividad, como anexo de los informes del período y del final.
   - También sería un elemento del catálogo.
4. **Actividades no tan atadas a su período.** Hoy solo se registra en el período planificado, o después si quedó incompleta. Las notas piden que no sea tan estricto como en la pasantía. Falta decidir si se puede adelantar una actividad.
5. **Más adelante:** cuando un cambio es tan grande que se vuelve otro proyecto, solo lo autoriza el decanato.

### Preguntas respondidas (16-nov-2026)

- **¿Dónde se escriben los productos por objetivo?** En el **plan de trabajo**.
- **¿Quién revisa la conclusión del objetivo?** El asesor, **junto con los productos**.

## 6. Actividades menos atadas a su período (16-nov-2026): hecho, sin commit

### Qué hace

- **Opción nueva en la ejecución:** `registro.adelantar`, en el constructor "Adelantar actividades".
  - Las plantillas de proyecto e investigación la traen encendida.
  - En las versiones ya guardadas falta y se lee como apagada.
- **Cuándo se puede adelantar.** Una actividad sin terminar, planificada solo en períodos posteriores, se puede registrar en el período abierto (`adelantable`). El servidor lo valida al guardar el registro y al adjuntar evidencias (`registrable`, en `actions/ejecucionProyecto.ts`).
- **Reglas de `actividadesDelPeriodo`, cuando recibe los registros:**
  - entra la actividad que ya tiene registro en el período, por ejemplo una adelantada;
  - sale la actividad planificada que ya llegó al 100 % en un período anterior: no hay que volver a registrarla. Esto vale también para una actividad planificada en varios períodos que se terminó en el primero.
- **En "Próximas":**
  - si una actividad se puede adelantar, lleva el estado "Período siguiente" y el botón **Adelantar**, que abre el registro en el período actual;
  - una que ya se adelantó dice "Adelantada al período N";
  - una que ya se terminó dice "Terminada por adelantado".
- **En el registro:**
  - el encabezado dice "Actividad adelantada al Período N";
  - un aviso indica para qué período estaba planificada.

### Pruebas

- **verificar_fichas:** 277 comprobaciones, entre ellas la sección 21; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador, con la v9 y la propuesta 73:**
  - la actividad 1.4.1.2, planificada para el período 5, se adelantó al período 2;
  - se registró completa y se envió al 100 %;
  - aparece como enviada en el período actual y como "Adelantada" en "Próximas".

### Datos de prueba

- **INV-ING-001 v9** (id 19): habilitada, creada con `--version-adelantar`.
- **Propuesta 73:**
  - está ligada a la v9;
  - su plan tiene la "Actividad futura de prueba" 1.4.1.2, que se agregó con `--actividad-futura --apartados` y ya se envió como adelantada.

## 5. Bitácora o reporte de modificaciones (16-nov-2026): hecho, sin commit

### Qué hace

- **Opción nueva en la ejecución:** `registro.modificaciones`, en el constructor "Reporte de modificaciones".
  - Las plantillas de proyecto e investigación la traen encendida.
  - En las versiones ya guardadas falta y se lee como apagada.
- **Dónde se escribe.** En cada actividad y en cada entrega de objetivo hay una tarjeta opcional, "¿Hubo algún cambio o acontecimiento?":
  - un tipo: Tiempo, Recursos y costos, Alcance u Otro acontecimiento;
  - y un texto.
  - Sin texto no se guarda nada. Con texto y sin tipo, se guarda como "otro".
  - Va en las columnas `modificacion_tipo` y `modificacion` de `registros_plan` y `entregas_objetivo`, que crea `scripts/fichas/crear_entregas_objetivo.ts`.
- **Bitácora en la ejecución.** La página de ejecución tiene una tarjeta "Reporte de modificaciones (bitácora)":
  - el conteo por tipo;
  - cada entrada en orden, con su período y su índice del plan.
  - Solo cuenta lo enviado o aprobado; los borradores no.
- **Informe del período.** Apartado "Reporte de modificaciones", con las entradas de ese período.
- **Informe final.** Elemento nuevo del catálogo, `reporte_modificaciones`.
  - Es generado: no se redacta ni se revisa aparte.
  - Va sin número, como anexo, entre la bibliografía y los anexos.
  - Necesita que la ejecución pida la bitácora.
  - La plantilla lo trae como `if_modificaciones`.
- **Módulo puro:** `lib/fichas/bitacora.ts`, con `TIPOS_MODIFICACION`, `limpiarModificacion`, `entradasBitacora`, `textoEntrada` y `bloquesBitacora`.
- **Lo que queda para después:** el caso de un cambio tan grande que se vuelve otro proyecto y debe autorizarlo el decanato.

### Pruebas

- **verificar_fichas:** 266 comprobaciones, entre ellas la sección 20; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador, con la v8 y la propuesta 73:**
  - la actividad 1.2.1.1 se envió con un cambio de tiempo;
  - el objetivo 1.2 se entregó con un cambio de alcance;
  - ambos aparecen en la bitácora de la ejecución, en el informe del período 2 y en el informe final, como el anexo "Reporte de modificaciones" sin número;
  - la pantalla del informe final marca los dos capítulos generados como "Se genera solo".

### Datos de prueba

- **INV-ING-001 v8** (id 18): habilitada, creada con `--version-bitacora`.
- **Propuesta 73:** está ligada a la v8.
  - La actividad 1.2.1.1 está enviada.
  - El objetivo 1.2 está enviado y espera la revisión del asesor.

## 4. Resultados del informe final por objetivo (16-nov-2026): hecho, sin commit

**Decisión del usuario.** El capítulo **se genera solo**: no se redacta y no se revisa aparte. La interpretación sigue en el capítulo de hallazgos y discusión.

### Qué hace

- **Elemento nuevo en el catálogo:** `resultados_objetivos`, "Resultados por objetivo".
  - Está en la sección Apartados académicos.
  - Solo va en el informe final, no se repite y necesita que la ficha tenga plan de trabajo.
  - La plantilla lo usa en `if_resultados`, "Resultados obtenidos".
- **Contenido del capítulo** (`lib/fichas/resultadosObjetivos.ts`, módulo puro), en este orden:
  - el objetivo general, con su avance y cuántos objetivos tienen sus productos aprobados;
  - cada objetivo específico (n.2, n.3…), con su avance, el estado de sus productos y cada producto con los anexos que lo contienen;
  - cada macroactividad, con su avance y la lista de sus actividades: índice, fechas, resultado del último registro enviado y "Evidencias: Anexo k".
  - Los borradores no cuentan.
- **Anexos.** Salen en el mismo orden: primero los productos de cada objetivo y luego las evidencias de sus actividades. Después van los del capítulo de anexos del equipo. Cada anexo indica su procedencia ("producto del objetivo 1.1" o "actividad 1.1.1.1"), en lugar de "actividad X".
- **En pantalla** (`InformeFinalEquipo.tsx`):
  - en la lista de capítulos aparece como "Se genera solo";
  - al abrirlo se ve tal como saldrá, sin editor ni envío.
  - El servidor rechaza guardar o enviar ese capítulo, y nunca queda pendiente de aprobación (`capituloGenerado`).
- **En el documento** (PDF y Word): se numera como los demás capítulos, con subtítulos por objetivo que también aparecen en el índice.

### Pruebas

- **verificar_fichas:** 252 comprobaciones, entre ellas la sección 19; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador, con la propuesta 73 en la v7:**
  - el capítulo 8 se muestra generado;
  - la vista de impresión numera 8.1 a 8.5 y lo incluye en el índice;
  - los anexos 1 y 2 son los productos del objetivo 1.1 y el anexo 3 es la evidencia de la actividad 1.1.1.1;
  - el Word se descarga y contiene el capítulo.

### Datos de prueba

- **INV-ING-001 v7** (id 17): habilitada, creada con `sembrar_equipo_investigacion.ts --version-resultados`.
- **Propuesta 73:** está ligada a la v7.

## 3. Diseño: productos por objetivo específico (propuesta del 16-nov-2026)

### 3.1 Ficha: constructor

- **Parámetro nuevo en la etapa del plan:** `productosObjetivo: "no" | "opcional" | "obligatorio"`.
  - Las plantillas nuevas de proyecto e investigación lo traen en "obligatorio".
  - En las versiones ya guardadas falta y se lee como "no", así que nada cambia para la 70, la 71 ni la 72.
- **Pestaña Plan del constructor:**
  - el selector "Productos esperados por objetivo específico";
  - la vista previa lo muestra;
  - la lista de cambios entre versiones lo menciona.

### 3.2 Plan de trabajo

- **Lista de productos:** cada objetivo específico (nivel 2) lleva una lista corta de productos esperados.
  - Va en el nodo como `productos?: string[]`.
  - Ejemplos: "Estudio de tiempos", "Documento de análisis de flujo", "Listado de levantamiento técnico".
  - Se escribe en el editor del plan, debajo del título del objetivo: un producto por línea, con botón para agregar o quitar.
- **Si es "obligatorio":** cada objetivo necesita al menos un producto para enviar el plan. El aviso dice "1.2: indica al menos un producto esperado del objetivo."
- **Quién lo escribe:** el responsable del objetivo, igual que el resto de su rama. Cambiar un producto cuenta como cambio en la rama, igual que el documento de una actividad, así que invalida las ratificaciones.
- **Lo que ya existe se mantiene:** el "documento solicitado" de cada actividad (nivel 4) sigue igual. La actividad pide su evidencia y el objetivo pide sus productos.

### 3.3 Ejecución: entrega de productos del objetivo

- **Tabla nueva `entregas_objetivo`.** Hay una fila por propuesta y objetivo, con:
  - quién la entrega;
  - la **conclusión del objetivo**;
  - el estado: borrador, enviado, observado o aprobado;
  - el período en que se envió;
  - el comentario del asesor y quién la revisó y cuándo.
- **Tabla nueva `productos_objetivo`.**
  - Guarda los archivos de cada entrega: PDF, imagen o enlace, como las evidencias de actividad. Cada uno indica a qué producto prometido corresponde.
  - Cada producto prometido necesita al menos un archivo o enlace.
- **Cuándo se habilita:**
  - cuando **todas las actividades del objetivo tienen su último registro enviado al 100 %**;
  - las que tienen subactividades cuentan como al 100 % cuando todas sus subactividades están terminadas;
  - antes de eso, la tarjeta muestra "En curso: 3 de 5 actividades al 100 %".
  - No hay calendario fijo: puede haber meses sin entregas o dos en el mismo mes.
- **Quién entrega:**
  - el responsable del objetivo;
  - si la ficha asigna responsable por actividad, cualquier integrante con actividades en ese objetivo.
- **Pantalla de entrega**, con el mismo estilo que el registro de actividad. Muestra:
  - los productos prometidos en el plan, cada uno con su espacio para adjuntar ("Esto es lo que se prometió");
  - debajo, la lista de las evidencias de sus actividades, en solo lectura y como referencia;
  - la conclusión del objetivo: texto obligatorio, en pasado y en tercera persona, con los mismos avisos de redacción del informe.
- **Para enviar hace falta:**
  - que esté habilitada;
  - un archivo o enlace por cada producto prometido;
  - la conclusión.
- **Revisión del asesor:**
  - aprueba o pide correcciones con comentario, igual que en las actividades;
  - en "Por revisar" aparece junto a las actividades enviadas;
  - si pide correcciones, la entrega vuelve a "observado" y se puede editar.
- **En la página de ejecución:**
  - una sección nueva, "Productos por objetivo", con una tarjeta por objetivo específico: avance, estado de la entrega y botón Entregar, Ver o Revisar;
  - en el cronograma, la fila del objetivo muestra un ✓ cuando sus productos están aprobados.

### 3.4 Informes

- **Informe del período:** un apartado "Productos entregados en el período" con los objetivos que se enviaron en él, sus productos (numerados como anexos) y su conclusión.
- **Informe final, conclusiones:** el capítulo se precarga con la conclusión de cada objetivo aprobada, una por objetivo y en orden. Encaja con la revisión que ya avisa si hay menos conclusiones que objetivos.
- **Informe final, ratificación:** no se puede ratificar mientras haya objetivos sin productos aprobados. Un objetivo sin productos prometidos (con "opcional") no bloquea.
- **Resultados ordenados por objetivo** (punto 2 de la sección 2): se hace después, sobre estas mismas tablas.

### 3.5 Entregas

| Parte | Qué incluye |
| --- | --- |
| **A. Ficha y plan** | El parámetro, los productos en el editor del plan, la validación, las ratificaciones y las pruebas. |
| **B. Entrega y revisión** | Las tablas, la habilitación, la pantalla de entrega, la revisión del asesor y la sección en la ejecución. |
| **C. Informes** | El apartado en el informe del período, la precarga de las conclusiones, el bloqueo de la ratificación y la versión 6 de prueba. |

Las tres partes se prueban en el navegador con la propuesta 73 y con el equipo de la 71.

### 3.6 Estado (16-nov-2026): hecho, sin commit

**Decisión de implementación.** Con productos "opcional", un objetivo sin productos declarados también tiene su entrega, solo con la conclusión. Así cada objetivo deja su conclusión para el informe final, y su aprobación cuenta para la ratificación.

| Parte | Archivos |
| --- | --- |
| **A. Ficha y plan** | `tipos.ts` (`productosObjetivo`, `PRECARGA_CONCLUSIONES_OBJETIVOS`, `PRECARGAS_EJECUCION`)<br>`planTrabajo.ts` (`NodoPlan.productos`, `productosDe`, validación, `cambioNoPermitido`, `planEjemplo`)<br>`plantillas.ts`<br>`validar.ts`<br>`diferencias.ts`<br>`EditorPlan.tsx`<br>`PlanTrabajoEquipo.tsx` (un producto por línea)<br>`actions/planTrabajo.ts` (`arbolValido`) |
| **B. Entrega y revisión** | Tablas `entregas_objetivo` y `productos_objetivo`, en `schema.ts` y `scripts/fichas/crear_entregas_objetivo.ts`<br>`lib/fichas/entregasObjetivo.ts`, módulo puro: `avanceObjetivo`, `quienesEntregan`, `problemasEntrega`, `revisarConclusionObjetivo`, `ESTADO_ENTREGA`<br>`actions/entregasObjetivo.ts`<br>`lib/evidenciaArchivo.ts`, validación de archivos que ahora comparten las evidencias de actividad y los productos<br>`EntregaObjetivoProyecto.tsx`<br>Las páginas `/egresado/ejecucion/objetivo` y `/asesor/ejecucion/[id]/objetivo`<br>La sección "Productos por objetivo" y la marca ✓ en el cronograma (`EjecucionProyecto.tsx`, `GanttProyecto.tsx`)<br>`EvidenciasActividad.tsx`, reutilizable con `subir`, `quitar` e `idBase` |
| **C. Informes** | El apartado 7, "Productos entregados por objetivo", en `InformePeriodoProyecto.tsx`<br>El capítulo de conclusiones del informe final se precarga con `textoConclusionesObjetivos`, desde `informeFinalFicha.ts`<br>El constructor ofrece esa fuente de precarga<br>La ratificación y la entrega del informe final se bloquean con "Productos del objetivo …" (`objetivosSinProductos`) |

**Pruebas:**
- **verificar_fichas:** 240 comprobaciones, entre ellas la sección 18; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **Tipos y lint:** limpios.

**Navegador, con la propuesta 73 en la v6:**
- La entrega del objetivo 1.1 se habilitó con su actividad al 100 %.
- Se adjuntó un enlace a cada uno de sus 2 productos.
- La conclusión mostró los avisos de primera persona y de futuro.
- Se envió, y apareció en el informe del período 2.
- El asesor la aprobó, y el cronograma muestra "✓ productos".
- El informe final dice "Falta aprobar: … Productos del objetivo 1.2 · 1.3 · 1.4".

**Sin probar en el navegador:**
- el editor del plan con la lista de productos, porque el plan de la 73 ya está aprobado;
- la entrega en equipo;
- el camino "Solicitar correcciones".

La sección 18 de verificar_fichas cubre su lógica.

**Datos de prueba en dev-fichas:**
- **INV-ING-001 v6** (id 16): habilitada, creada con `sembrar_equipo_investigacion.ts --version-productos`.
- **Propuesta 73:**
  - está ligada a la v6;
  - su plan tiene productos de prueba, puestos con `--productos-plan --apartados`;
  - el objetivo 1.1 está aprobado y los objetivos 1.2 a 1.4 están en curso.
