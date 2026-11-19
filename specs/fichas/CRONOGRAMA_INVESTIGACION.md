# Cronograma de investigación (notas del 19-nov-2026)

Segundo apartado de las notas de la reunión donde se mostró la ficha de investigación (el primero fue el protocolo, ver PROTOCOLO_AJUSTES.md). Este documento es el diseño; nada está implementado todavía.

## 1. Lo que hay hoy

- **Un solo plan para proyecto e investigación** (`EtapaPlan`, `planTrabajo.ts`). Es el árbol genérico: objetivo general → objetivo específico → macroactividad → actividad → subactividad.
- **Columnas:** subperíodos o períodos. Las hojas llevan el monto o la marca; los niveles superiores suman.
- **Presupuesto apagado en investigación** (`plantillas.ts`, respuesta Q4 del 12-nov). El protocolo tiene "Recursos y presupuesto" por categoría (entrega C del protocolo).
- **Productos por objetivo y documento solicitado:** se declaran en el plan (notas del 13-nov). Al terminar las actividades, el objetivo se entrega con sus productos y su conclusión, y el asesor los revisa juntos.
- **Avance:** las hojas toman su último avance registrado (0–100 %) y cada nivel promedia a sus hijos (`avancePorNodo`).
- **Informe final:** "Resultados por objetivo" se genera solo (macroactividades, actividades y productos). "Conclusiones y recomendaciones" se precarga con las conclusiones de los objetivos.
- **Bitácora:** existe (`registro.modificaciones`). El caso "cambio muy grande → decanato" quedó pendiente.
- **Pasantía:** su cronograma es otro, el elemento `cronograma` del catálogo, dentro de la propuesta.

## 2. Puntos de las notas y lo que propongo

| # | Punto | Hoy | Propuesta |
|---|---|---|---|
| 1 | El cronograma de investigación sí lleva presupuesto | Apagado | Se vuelve a encender en la plantilla de investigación (§3). |
| 2a | Cronogramas distintos: pasantía, proyecto e investigación | Un solo plan | "Tipo de cronograma" en la etapa del plan (§3). |
| 2b | Cada objetivo se organiza por el proceso metodológico | Macroactividades genéricas | Cinco elementos fijos por objetivo, al mismo nivel y con subactividades (§4). |
| 2c | Metodología respaldada por referencias, también la propia | No existe por objetivo | La metodología de cada objetivo se escribe en el plan con citas del registro de fuentes (§5). |
| 2d | Avance por elementos del cronograma | Promedio de actividades | Cada elemento vale una parte igual del objetivo y sus subactividades la reparten (§6). |
| 2e | El informe final se construye por objetivo, con el mismo proceso | Resultados por macroactividad | Un capítulo por objetivo con sus cinco partes (§8). |
| 3 | Un momento para preparar el informe final y las conclusiones finales | No existe | Bloque final "Preparación del informe final" y conclusiones finales aparte de las preliminares (§7). |
| 4a | Productos y documentos: no en el cronograma, sí en las actividades | Se declaran en el plan | En investigación se apagan en el plan; las evidencias van en los registros (§9). |
| 4b | Las modificaciones las acepta el asesor, documentadas y justificadas | Bitácora sin aceptación | El asesor acepta u observa cada entrada de la bitácora (§9). |
| 4c | El asesor valida la metodología y los 4 elementos de cada objetivo | Revisa productos y conclusión | Valida cada elemento al concluirlo (§6). |

## 3. Tipo de cronograma y presupuesto (puntos 1 y 2a)

**Campo nuevo `EtapaPlan.estructura`**, que falta en las versiones anteriores y entonces vale "actividades":
- **"actividades" (Cronograma de proyecto):** el árbol de hoy, sin cambios.
- **"investigacion" (Cronograma de investigación):** el de §4.

En el constructor, el plan muestra "Tipo de cronograma: de proyecto / de investigación". El de pasantía sigue siendo el elemento `cronograma` de la propuesta. En el catálogo y en la vista previa, los tres aparecen con su nombre: "Cronograma de pasantía", "Cronograma de proyecto" y "Cronograma de investigación".

**Presupuesto.** La plantilla de investigación vuelve a `presupuesto.activo: true`. El monto va en las hojas (el elemento o su subactividad) por subperíodo, igual que en proyecto. Ver la pregunta Q2 sobre su relación con "Recursos y presupuesto" del protocolo.

## 4. Estructura por objetivo (punto 2b)

```
1 Objetivo general
  1.1 Objetivo específico 1
    1.1.1 Metodología             ← puede tener subactividades
    1.1.2 Desarrollo              ← puede tener subactividades
    1.1.3 Resultados              ← puede tener subactividades
    1.1.4 Conclusiones preliminares
    1.1.5 Elementos de discusión  ← opcional; puede quedar sin nada al inicio
  1.2 Objetivo específico 2       ← la misma estructura
  …
  1.n Preparación del informe final y conclusiones finales   (§7)
```

- **Elementos del proceso (nivel 3).** Al agregar un objetivo específico, sus cinco elementos se crean solos. No se pueden borrar, renombrar ni reordenar, y quedan al mismo nivel. Cada nodo lleva `componente: "metodologia" | "desarrollo" | "resultados" | "conclusiones" | "discusion"`.
- **Configurables por ficha** (`EtapaPlan.componentes`): nombre, si es obligatorio y si cuenta en el avance. Por defecto los cuatro primeros son obligatorios y "Elementos de discusión" es opcional.
- **Subactividades (nivel 4).** Cada elemento puede tener las suyas. Si no tiene, el elemento mismo es la hoja: marca sus subperíodos y lleva su monto.
- **Reglas del plan:**
  - cada elemento obligatorio debe estar planificado en algún subperíodo, él o sus subactividades;
  - la discusión puede quedar sin planificar;
  - las reglas de macroactividades y actividades por objetivo no aplican a este tipo.
- **Responsable:** se sigue asignando por objetivo, como hoy. Plan individual y panel de carga sin cambios.

## 5. Metodología de cada objetivo con referencias (punto 2c)

**En el plan, el elemento "Metodología" de cada objetivo lleva una descripción del procedimiento:** qué se hará, con qué técnicas e instrumentos y con quiénes.
- **Párrafos con cita.** Se escriben como la fundamentación del protocolo (formato "citado"): cada párrafo con sus fuentes del registro de fuentes del trabajo. Las fuentes que se citen aquí pasan a las referencias.
- **Metodología propia.** Una casilla "Es una metodología propia". Si se marca, se pide una parte "Fundamentación de la metodología propia", también con citas, que explica en qué métodos o investigaciones anteriores se basa.
- **Regla:** el plan no se envía si la metodología de algún objetivo está vacía o no tiene ninguna cita.
- **Ayuda:** se puede partir de la metodología del protocolo con un botón "Traer de la metodología del protocolo".
- **Revisión:** el asesor revisa la metodología de cada objetivo cuando revisa el plan, y la ve al lado de cada objetivo.

## 6. Ejecución por elementos y avance (puntos 2d y 4c)

**Cada elemento se registra en la ejecución según lo que es:**

| Elemento | Qué registra el egresado | Revisa el asesor |
|---|---|---|
| Metodología | Confirma o ajusta la metodología del plan. Un ajuste pide justificarlo en la bitácora. | Valida la metodología aplicada |
| Desarrollo | Lo de hoy: del… al…, qué se hizo y cómo, con evidencias. Uno o varios registros. | Sí |
| Resultados | Qué se obtuvo, en texto, tablas y evidencias | Sí |
| Conclusiones preliminares | La conclusión del objetivo, revisada en pasado y en tercera persona | Sí |
| Elementos de discusión | Texto opcional | Sí, si se usó |

- **Concluir un elemento.** Cuando un elemento (o todas sus subactividades) está completo, el egresado lo da por concluido y el asesor lo valida u observa. Una observación lo devuelve a borrador.
- **Avance.** Un elemento validado cuenta su parte completa. Sus subactividades reparten esa parte: si hay 2 y una está terminada, el elemento va a la mitad.
  - **El objetivo:** con los cuatro obligatorios, cada uno vale 25 %. La discusión cuenta solo si el objetivo la usa, y entonces cada elemento vale 20 % (pregunta Q1).
  - **El objetivo general:** promedio de los objetivos y del bloque de preparación del informe.
- **Fin del objetivo.** El objetivo se cierra cuando sus elementos obligatorios están validados. Esto reemplaza en investigación a la entrega del objetivo con sus productos (13-nov).
- **Lo que ya existe y se mantiene:** el Gantt "Mi avance" y el del equipo, el arrastre al período siguiente y la opción de adelantar.

## 7. Preparación del informe final y conclusiones finales (punto 3)

- **Bloque final del cronograma:** "Preparación del informe final y conclusiones finales". Va después del último objetivo, no es un objetivo y no lleva los cinco elementos. Tiene sus propias actividades, que se planifican en los últimos subperíodos y llevan monto si hay presupuesto.
- **Configurable:** se activa en el plan (`EtapaPlan.cierre`), con su nombre editable.
- **En el informe final hay dos clases de conclusiones:**
  - **Conclusiones preliminares:** las de cada objetivo, que van dentro del capítulo de ese objetivo (§8).
  - **Conclusiones finales:** un apartado propio del informe, que se redacta en el bloque de preparación. Hoy se precarga con las conclusiones de los objetivos; propongo que ya no se precargue. Las preliminares se muestran al lado, como consulta.

## 8. Informe final por objetivo (punto 2e)

**El capítulo generado "Resultados por objetivo" pasa a ser "Desarrollo de la investigación por objetivo".** En el informe de investigación:
```
n. Desarrollo de la investigación por objetivo
  n.1 Objetivo específico 1
      Metodología utilizada          (la del plan o la ajustada, con sus citas)
      Desarrollo realizado           (registros por fecha, con sus evidencias citadas como anexos)
      Resultados obtenidos
      Conclusiones preliminares
      Elementos de discusión         (si se usaron)
  n.2 Objetivo específico 2 …
```
- **Generado:** se arma solo con lo validado en la ejecución. Las citas de la metodología suman sus fuentes a las referencias.
- **Conclusiones finales:** van después, como un apartado redactado (§7).
- **Proyecto:** no cambia.

## 9. Productos, evidencias y modificaciones (punto 4)

- **En el cronograma de investigación no hay productos ni documentos solicitados.** `productosObjetivo` y `documentoSolicitado` se apagan en la plantilla y el editor no los muestra en este tipo. Las evidencias siempre van en los registros de cada elemento o subactividad.
- **Modificaciones aceptadas por el asesor.** Opción nueva `registro.modificaciones.aprueba`:
  - **"asesor":** en investigación, el asesor acepta u observa cada entrada de la bitácora.
  - **"decanato":** en proyecto, para los cambios muy grandes. Sigue pendiente.
- **Sin cambio:** cada entrada sigue pidiendo qué cambió y por qué, y queda en el reporte de modificaciones.
- **Agregar elementos al plan durante la ejecución:** sin pasar por una nueva aprobación del plan. Por ejemplo, una subactividad nueva por un hallazgo. Se registra en la bitácora y el asesor la acepta.

## 10. Entregas

| Entrega | Qué | Puntos |
|---|---|---|
| **E1** | Tipo de cronograma, estructura por elementos, bloque de preparación del informe y presupuesto en investigación. Editor del plan, reglas, vista del asesor, cronograma del documento del protocolo y plantilla nueva. | 1, 2a, 2b, 3 (plan), 4a |
| **E2** | Metodología de cada objetivo con citas y metodología propia en el plan; revisión del asesor | 2c |
| **E3** | Ejecución por elementos, validación del asesor, avance por elementos, conclusiones preliminares y modificaciones aceptadas por el asesor | 2d, 4b, 4c |
| **E4** | Informe final por objetivo y conclusiones finales aparte | 2e, 3 (informe) |

Cada entrega lleva pruebas en `verificar_fichas`, `verificar_flujo` y en el navegador con una versión nueva de INV-ING-001.

## 11. Compatibilidad

- **Las versiones anteriores siguen igual:** sin `estructura`, son "actividades".
- **Los planes de las propuestas 71–74 no se convierten:** la estructura nueva se prueba con una versión y una propuesta nuevas.

## 12. Preguntas

**Respondidas el 19-nov-2026: «sí» a las cuatro propuestas.** Discusión cuenta solo si se usa; el presupuesto del plan convive con el del protocolo; la metodología se escribe en el plan; el asesor valida cada elemento al concluirlo.

- **Q1. Elementos de discusión en el porcentaje.** Propuesta: cuenta solo si el objetivo la usa, sea porque la planificó o porque la registró. Sin ella, los cuatro obligatorios valen 25 % cada uno; con ella, 20 %. ¿O nunca cuenta?
- **Q2. Presupuesto.** Propuesta: conviven. El protocolo lleva "Recursos y presupuesto" por categoría (estimado) y el plan reparte los montos por elemento y subperíodo. ¿O el presupuesto del plan reemplaza al del protocolo?
- **Q3. Dónde se escribe la metodología de cada objetivo.** Propuesta: en el plan, antes de ejecutar, y en la ejecución solo se confirma o se ajusta. ¿Es así?
- **Q4. Validación del asesor.** Propuesta: valida cada elemento al concluirlo. ¿O valida todo el objetivo de una vez al final?

## 13. Estado

### Entrega E1: hecha el 19-nov-2026, sin commit

**Qué hace:**
- **Modelo** (`tipos.ts`):
  - `EtapaPlan.estructura` ("actividades" | "investigacion"), `componentes` y `cierre`;
  - `COMPONENTES_INVESTIGACION`, `COMPONENTES_CIERRE`, `CIERRE_POR_DEFECTO`;
  - `componentesDe`, `cierreDe`, `estructuraPlan`, `esCronogramaInvestigacion` y `NIVELES_PLAN_INVESTIGACION`.
- **Nodos del plan** (`planTrabajo.ts`):
  - `NodoPlan` agrega `componente` (nivel 3) y `cierre` (el bloque de nivel 2).
  - `esHojaPlan`: un elemento sin subactividades es hoja. Reemplaza la condición "nivel ≥ 4" en la ejecución, la entrega del objetivo y los resultados.
  - `objetivosEspecificos`, sin el bloque de cierre.
  - `normalizarArbol`: pone los elementos de cada objetivo y el bloque de cierre al final. Conserva lo planificado y las subactividades, descarta lo que no es un elemento, toma los nombres de la ficha y es idempotente.
- **Reglas** (`validarPlanEquipo`, en investigación):
  - sin mínimos de macroactividades ni productos;
  - cada elemento obligatorio planificado, él o sus subactividades;
  - la discusión es libre;
  - las subactividades necesitan título y período;
  - se llega hasta el nivel 4;
  - el responsable va por objetivo, y el bloque de cierre no lo lleva.
  - **Equipo:** `planIndividual` incluye el bloque de cierre para todos, y la carga no lo cuenta como objetivo.
- **Ficha** (`validar.ts`): el cronograma de investigación es solo para esa modalidad, con responsable por objetivo y sin productos ni documentos. Además pide al menos un elemento obligatorio, sin nombres repetidos, y revisa la forma de `componentes` y `cierre`.
- **Diferencias:** "Tipo de cronograma", "Elementos de cada objetivo" y "Preparación del informe final".
- **Plantilla** (`planNuevo(…, "investigacion")`):
  - cronograma de investigación;
  - **con presupuesto** (punto 1);
  - sin productos ni documento solicitado;
  - con el bloque de cierre.
  - El capítulo "Conclusiones y recomendaciones" del informe final ya no se precarga de las conclusiones de los objetivos (§7). La precarga sigue disponible si una ficha la configura.
- **Constructor** (`EditorPlan.tsx`):
  - tarjeta "Tipo de cronograma" (de proyecto o de investigación; esta última solo en investigación);
  - "Elementos de cada objetivo": nombre editable y obligatorio u opcional;
  - "Preparación del informe final": activa o no, con su nombre;
  - niveles propios;
  - oculta subactividades, macroactividades, documento y productos;
  - el cronograma de ejemplo muestra la estructura nueva.
- **Vista del egresado** (`VistaPrevia.tsx`): frases del cronograma de investigación.
- **Catálogo:** el elemento `cronograma` se llama "Cronograma de pasantía".
- **Editor del plan del egresado y del asesor** (`PlanTrabajoEquipo.tsx`):
  - los elementos y el bloque de cierre no se renombran ni se quitan;
  - "+ objetivo" crea el objetivo con sus elementos;
  - "+ subactividad" en cada elemento;
  - los elementos sin subactividades llevan monto por subperíodo;
  - "(opcional)" en la discusión.
- **Servidor** (`actions/planTrabajo.ts`):
  - el árbol inicial se normaliza;
  - se normaliza al leer y al guardar;
  - `arbolValido` revisa `componente` y `cierre`.
- **Documento del protocolo:** el cronograma muestra los elementos y el bloque de cierre, con la columna "Objetivo, elemento del proceso o subactividad".
- **De paso:** los pendientes del protocolo nombran una sola vez un subapartado con dos faltas. Antes salía "Desarrollo inicial, Desarrollo inicial".

**Lo que queda para E3 y E4:**
- **Registro y avance:** en la ejecución, cada elemento sin subactividades se registra como una actividad de las de hoy. El registro propio de cada elemento, la validación del asesor y el avance por elementos (la discusión cuenta solo si se usa) son de E3.
- **Bloque de cierre:** el capítulo "Resultados por objetivo" del informe final todavía lo trataría como un objetivo más. Se arregla en E4.

### Pruebas
- **verificar_fichas:** 378 comprobaciones, entre ellas la sección 26 nueva; "Todo en orden". Se actualizaron las que asumían el plan de investigación anterior: documento solicitado, sin presupuesto, productos y la precarga de conclusiones.
- **verificar_flujo 71–74:** "Flujo coherente".
- **Tipos:** limpios.
- **Lint:** sin nada nuevo. Las dos advertencias `_id` de los scripts de siembra ya existían.
- **En el navegador:**
  - **Constructor:** borrador v12, "Sin problemas". Al habilitar, la lista de cambios muestra el tipo de cronograma, los elementos, la preparación del informe, el presupuesto (no → un monto en USD), y documento y productos (obligatorio → no).
  - **Propuesta 74 (inv.citas):**
    - el plan, que ya existía con 4 objetivos, se mostró con sus 5 elementos cada uno y el bloque 1.5, con 18 pendientes;
    - puse $40 + $10 en la metodología 1.1.1 y una subactividad "Aplicar la encuesta de hábitos" de $25 en el desarrollo;
    - al guardar y recargar persiste, con 16 pendientes;
    - en la vista de impresión del protocolo, el cronograma trae los elementos, la subactividad y el bloque de cierre.

### Datos de prueba
- **INV-ING-001 v12** (id 22): habilitada, creada con `--version-cronograma` desde la v11.
- **Propuesta 74:** ligada a la v12. Su plan está en redacción, con los montos de prueba de arriba.

### Entrega E2: hecha el 19-nov-2026, sin commit

**Qué hace:**
- **Opción de la ficha:** `EtapaPlan.metodologiaObjetivo`. La plantilla de investigación la trae encendida; falta = no se pide. En el constructor es "Metodología de cada objetivo con referencias", dentro de "Elementos de cada objetivo". Validaciones de la ficha:
  - solo vale en el cronograma de investigación;
  - el elemento "Metodología" debe ser obligatorio.
- **Dónde se guarda:** en el nodo del elemento "Metodología" de cada objetivo, como `NodoPlan.metodologia` con `parrafos`, `propia` y `fundamentacion`. Los párrafos usan el mismo formato citado del protocolo (`ParrafoCitado`).
- **Módulo puro** (`lib/fichas/metodologiaPlan.ts`): `pideMetodologia`, `leerMetodologia`, `problemasMetodologia`, `fuentesCitadasPlan`, `arbolConCitas`, `textoMetodologia` y `metodologiaValida`.
- **Reglas para enviar el plan:**
  - la metodología de cada objetivo necesita texto y **al menos una cita**; no se exige en cada párrafo;
  - si es una metodología propia, se pide su fundamentación, también con al menos una cita.
  - En equipo, solo el responsable del objetivo cambia su metodología (`cambioNoPermitido`).
- **Servidor:**
  - `guardarPlanTrabajo` arma las citas con el registro de fuentes y quita las fuentes que ya no existen;
  - `recalcularCitas` (al corregir o quitar una fuente) también actualiza el plan;
  - `arbolValido` revisa la forma;
  - `DatosPlan.metodologia` trae el registro de fuentes y la metodología del protocolo, un párrafo por subapartado escrito.
- **Pantalla** (`MetodologiaObjetivo.tsx`, debajo del elemento "Metodología" de cada objetivo):
  - párrafos citados con el registro, "+ Nueva fuente" (solo el líder) y "Así queda" con la cita;
  - "Traer de la metodología del protocolo" cuando está vacía;
  - la casilla "Es una metodología propia", que abre su fundamentación;
  - estado "Con sus referencias" o "Pendiente".
  - El asesor la lee en solo lectura, con sus citas.
- **Registro de fuentes:** las fuentes citadas en el plan cuentan como "Citada" en las referencias del protocolo.
- **Vista del egresado:** una frase sobre la metodología por objetivo.

### Pruebas
- **verificar_fichas:** 397 comprobaciones, entre ellas la sección 27 nueva; "Todo en orden". La sección 26 prueba la estructura sin la metodología, y el ejemplo del constructor trae una metodología citada.
- **verificar_flujo 71–74:** "Flujo coherente".
- **Tipos y lint:** limpios en lo tocado.
- **En el navegador:**
  - **Constructor:** v13 (id 23); al habilitar sale "metodología de cada objetivo con referencias, no → sí".
  - **Propuesta 74, como egresado:**
    - la metodología del objetivo 1.1 con la fuente Hernández-Sampieri (2014): "Así queda … (Hernández-Sampieri, 2014)", y los pendientes bajan de 20 a 19;
    - marcada como propia, con su fundamentación citando a Tamayo (2019);
    - al guardar y recargar persiste, y la base guarda las citas armadas por el servidor.
  - **Propuesta 74, como asesor:** la ve en solo lectura, con las citas y la fundamentación.
  - **"Traer de la metodología del protocolo":** con una metodología de protocolo temporal, trajo un párrafo por subapartado. El texto temporal se quitó y el cambio no se guardó.
  - **Referencias del protocolo:** Tamayo aparece como "Citada", aunque solo se cita en el plan.

### Datos de prueba
- **INV-ING-001 v13** (id 23): habilitada con `--version-cronograma`, que ahora incluye la metodología por objetivo.
- **Propuesta 74:** ligada a la v13, con la metodología del objetivo 1.1 escrita.

### Entrega E3: hecha el 19-nov-2026, sin commit

**Cómo se armó:** sobre lo que ya existía. Cada elemento sin subactividades (o cada subactividad suya) es una hoja del plan. Se registra por período en `registros_plan`, con fechas, qué se hizo, resultado, evidencias, avance y bitácora, y el asesor aprueba u observa cada registro. No hubo tablas nuevas.

**Qué hace:**
- **Elemento validado:** cuando el último registro de cada una de sus hojas llega al 100 % y el asesor lo aprueba. Estados: sin iniciar, en curso, con observaciones, "concluido, por validar" y "validado por el asesor".
- **Objetivo validado:** cuando lo están todos los elementos que cuentan. Esto reemplaza en investigación la entrega del objetivo con productos.
- **Módulo puro** (`lib/fichas/elementosEjecucion.ts`): `estadoElemento`, `elementoCuenta`, `procesoPorObjetivo`, `avancesEnviados`, `elementoDe`, `hojasElemento`, `ESTADO_ELEMENTO` y `TEXTOS_ELEMENTO` (los textos del registro de cada elemento).
- **Avance (Q1):**
  - `normalizarArbol` marca la discusión con `opcional`;
  - `avancePorNodo` no cuenta un elemento opcional sin nada planificado ni avance. Con los 4 obligatorios, cada uno vale 25 %; con la discusión, 20 %.
  - El Gantt, los informes del período y los resultados usan el mismo cálculo.
- **Registro de cada elemento** (`RegistroActividadProyecto.tsx`): títulos, ayudas y ejemplos propios de cada elemento.
  - **Metodología:** muestra la metodología planificada con sus citas, y la fundamentación si es propia; un ajuste se reporta como "Ajuste a la metodología".
  - **Conclusiones preliminares y finales:** se revisa la redacción (en pasado y en tercera persona) en pantalla y en el servidor.
  - **Asesor:** el botón es "Validar elemento" al 100 % y "Aprobar avance" antes. El texto avisa que, al aprobar, acepta el cambio reportado en la bitácora.
- **Ejecución** (`EjecucionProyecto.tsx`): tarjeta nueva "Proceso por objetivo", por objetivo y bloque de preparación del informe.
  - avance y "N de M objetivos validados";
  - cada elemento y subactividad con su porcentaje y su estado;
  - "(opcional; no se usó, no cuenta)" para la discusión sin usar;
  - enlace "Registrar", "Ver" o "Revisar", o "Período N" si todavía no se puede registrar.
- **Bitácora:**
  - **Tipos nuevos:** "Ajuste a la metodología" y "Hallazgo o supuesto nuevo".
  - **Estado de cada entrada en investigación:** "Por aceptar", "Aceptada por el asesor" (al aprobar el registro que la reporta) u "Observada".
  - `EntradaBitacora.estado`.

**Lo que queda pendiente:** agregar subactividades nuevas al plan durante la ejecución, por un hallazgo. Hoy el hallazgo se documenta en la bitácora del elemento y lo acepta el asesor, pero el plan aprobado no cambia.

### Pruebas
- **verificar_fichas:** 416 comprobaciones, entre ellas la sección 28 nueva:
  - 25 % y 20 % según la discusión;
  - estados del elemento, también con subactividades;
  - cierre del objetivo;
  - la bitácora con los tipos nuevos y su estado.
  - "Todo en orden".
- **verificar_flujo 71–74:** "Flujo coherente".
- **Tipos y lint:** limpios. La advertencia `_id` del script de siembra ya existía.
- **En el navegador, propuesta 74 (v13), en ejecución:**
  - **Proceso por objetivo:** muestra los 4 objetivos con sus 5 elementos y el bloque 1.5.
  - **Egresado:**
    - registró la metodología 1.1.1 (fechas, cómo se aplicó, una evidencia de enlace, avance 100 % y un "Ajuste a la metodología" en la bitácora) y la envió;
    - quedó "Concluido, por validar", el objetivo en 25 % y la bitácora "Por aceptar".
  - **Asesor:** "Validar elemento" la dejó "Validado por el asesor", y la bitácora quedó "Aceptada por el asesor".

### Datos de prueba
- **Propuesta 74 (inv.citas):**
  - con el protocolo completado de prueba, 20 fuentes, el plan con `--cronograma-prueba` (aprobado) y en ejecución con `--iniciar` (carta desde el 15-oct-2026);
  - la fundamentación se completó con 4 párrafos citados de prueba;
  - tiene el registro validado de la metodología 1.1.1.
- **Script:** `--cronograma-prueba` en `sembrar_equipo_investigacion.ts`.

### Entrega E4: hecha el 19-nov-2026, sin commit

**Qué hace:**
- **Capítulo por objetivo** (`resultadosObjetivos.ts`): si el plan es un cronograma de investigación (`esPlanPorElementos`), el capítulo generado `resultados_objetivos` lo arma `desarrolloPorObjetivo`:
  - **n.1 Objetivo general:** avance y objetivos validados.
  - **n.k Objetivo específico, por partes:**
    - *Metodología utilizada:* la del plan con sus citas, la fundamentación si es propia y "Aplicación:" con sus registros.
    - *Desarrollo realizado:* registro por registro, con subactividad, fechas, lo que se hizo, lo que se obtuvo y sus evidencias como anexos.
    - *Resultados obtenidos* y *Conclusiones preliminares.*
    - *Elementos de discusión:* solo si se usaron.
  - Lo que todavía no tiene registros sale como "Pendiente".
  - El bloque de preparación del informe no entra.
  - Los borradores no cuentan.
- **Plantilla:** el capítulo se llama "Desarrollo de la investigación por objetivo". `--version-cronograma` lo renombra en las versiones nuevas; la v13 ya habilitada conserva "Resultados obtenidos".
- **Entrega del informe final:** en investigación pide que cada objetivo y el bloque de cierre tengan validados todos sus elementos que cuentan (`objetivosSinValidar`, en `pendientesAprobacion`).
- **Conclusiones finales:** el capítulo de tipo "conclusiones" muestra, para consultar, las conclusiones preliminares de cada objetivo y el registro de conclusiones finales del bloque de cierre (`DatosInformeFinal.consulta`). No se precargan.
- **Referencias:** las fuentes citadas en la metodología ya están en el registro, que entra completo en la bibliografía del informe final (entrega D del protocolo).
- **Pantalla:** el capítulo generado muestra también los bloques "Pendiente".
- **Catálogo y vista del egresado:** describen el capítulo por objetivo.

### Pruebas
- **verificar_fichas:** 426 comprobaciones, entre ellas la sección 29 nueva; "Todo en orden". Se actualizó la que buscaba el capítulo por su título anterior.
- **verificar_flujo 71–74:** "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador, propuesta 74, vista del asesor:**
  - el capítulo 8 sale por objetivo: metodología del 1.1 con sus citas, fundamentación propia, "Aplicación: Del 16/10/2026 al 30/10/2026…" y "Evidencias: Anexo 1", con las demás partes "Pendiente";
  - la vista de impresión numera 8.1, 8.2 y 8.2.1;
  - el capítulo 11 trae las conclusiones preliminares para consultar;
  - los pendientes para entregar incluyen "Validación de los elementos del objetivo 1.1…" y el bloque de cierre.

## 14. Lo que queda del cronograma de investigación

- Agregar subactividades nuevas al plan durante la ejecución, por un hallazgo (ver E3).
