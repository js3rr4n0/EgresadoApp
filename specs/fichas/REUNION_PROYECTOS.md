# Reunión con el asesor: ejecución de proyectos (notas y ajustes, 6-nov-2026)

Notas de la reunión, comparadas con lo que ya hace la rama `fase-2-fichas` (P0–P6 y la pantalla de ejecución). Cada punto dice qué se pidió, qué existe hoy y qué ajuste toca. Contexto: [FLUJO_PROYECTO.md](FLUJO_PROYECTO.md) y [FICHA_PROYECTO.md](FICHA_PROYECTO.md).

## 1. Comparación punto por punto

| # | Lo que se dijo en la reunión | Lo que existe hoy | Ajuste |
|---|---|---|---|
| 1.1 | El tiempo de ejecución cambia según la modalidad, y se ajusta en la ficha. | La etapa de ejecución define los períodos, la duración y los subperíodos. | Ninguno. |
| 1.2 | Proyecto no lleva métrica. Los reportes son sencillos y **no llevan referencias bibliográficas**. | Ya no hay métrica (0). Sin embargo, la plantilla de proyecto deja el marco teórico en **"opcional"**. | **A1.** Que el marco teórico venga en "no" por defecto en proyecto, y quitar el campo de referencias de su registro. |
| 1.3 | El plan de trabajo funciona distinto con 1 integrante que con 2 o 3, y eso se decide desde la ficha. | El plan general y el individual, el responsable por objetivo o actividad, el panel de carga y los permisos por integrante. **Solo se probó con 3 integrantes.** | **A2.** Probar un proyecto individual y ocultar ahí lo que no aplica: el responsable, la carga y "Mi plan". |
| 1.4 | La jerarquía es OG → OE (**al menos 3 o 4 por participante**) → subactividades. El avance se mide a partir de ella. | Ya existen los 5 niveles, un mínimo configurable de OE por integrante (3 por defecto) y el avance por nivel. | Esto **responde la pregunta 1** de §7: el mínimo es por participante. Falta confirmar si el número por defecto es 3 o 4. |
| 2 | Un catálogo de elementos más amplio: archivo, imagen, enlace, lista, presupuesto, tabla y gráfico, y más reglas que solo las palabras. | Hay 9 elementos. El "Bloque de texto" solo tiene un mínimo y un máximo de palabras. Las respuestas se guardan como texto (`respuestas_espacios.contenido`). | **C1.** Ampliar el catálogo (ver §2). |
| 3.1 | El sistema calcula el avance; no es un dato que escriba el egresado. Lo que queda pendiente (el 30 %) pasa al período siguiente y se ve como un Gantt dentro del informe. | `avancePorNodo`: cada hoja toma su último avance y los niveles de arriba promedian el de sus hijos. **Pero el avance de la hoja lo escribe el egresado (0–100), y una actividad incompleta no aparece en el período siguiente** si no tiene monto ahí (`actividadesDelPeriodo`). | **A3.** Pasar automáticamente las actividades con avance < 100 % al período siguiente. **B1.** Agregar un Gantt de lo planificado frente a lo real, en la pantalla y en el informe. Hay que **definir la fuente del avance** (ver §3). |
| 3.2 | Una tabla de resultados por actividad, con evidencias: imágenes, documentos, videos. | Los registros de proyecto **no admiten adjuntos** (ya estaba entre los pendientes). En pasantía ya existen `ImagenesActividad`, `SubirAnexo`, `RecortadorImagen` y la cita del origen. | **A4.** Reutilizar los adjuntos de pasantía en `registros_plan`. **B2.** Sección "Resultados y evidencias" en el informe del período: actividad → resultado → evidencias numeradas. |
| 3.3 | Reutilizar la indexación de los textos de pasantía. | Pasantía numera las imágenes en el orden del cronograma (código de actividad + letra, número correlativo), arma el índice de contenidos y de imágenes y les pone su nota de origen (`informeCompilado.ts`, `DocumentoFinal.tsx`). El informe de proyecto **no numera nada**. | **A5.** Usar la misma numeración y las mismas leyendas en `InformePeriodoProyecto`, y el índice en el informe final. |
| 4 | Separar la **construcción** de la ficha de su **comportamiento** en la ejecución, y que el administrador pueda ajustar este último. | El editor ya tiene las pestañas Propuesta, Plan y Ejecución. Las reglas de comportamiento (modo de registro, de informe, avance, mismo equipo) están mezcladas con la estructura. | **B3.** En cada etapa del editor, agrupar los campos en "Estructura" y "Comportamiento", sin cambiar el formato del JSON. |
| 5.1 | Elegir la **metodología** del proyecto, que puede cambiar la estructura y el seguimiento. | No existe en ningún lado: ni en la cohorte, ni en la ficha, ni en la propuesta. | **C2.** Ver §4. |
| 5.2 | **Dentro o fuera de la universidad**, en las 3 modalidades. | No existe. Ya había una pregunta abierta parecida ("proyecto para la universidad, que solo entrega el informe final"). | **C2.** |
| 5.3 | "La cohorte ya contemplaba" esos dos criterios. | La tabla `periodos` (la cohorte) solo tiene fechas y `activo`. **No existen esos campos en el código.** | Confirmar con el asesor si eran parte del diseño original y no se implementaron. |

## 2. Catálogo de elementos ampliado (C1)

**Elementos nuevos:**

| Elemento | Qué guarda | Reglas configurables |
|---|---|---|
| Archivo adjunto | Uno o varios archivos | Tipos permitidos (PDF, Word, etc.), tamaño máximo, cantidad mínima y máxima |
| Imagen | Imagen con su leyenda y su origen (como en pasantía) | Cantidad, si pide recorte, si la leyenda es obligatoria |
| Enlace | URL con una descripción | Cantidad; dominios permitidos (por ejemplo, GitHub) |
| Lista | Elementos cortos | Cantidad mínima y máxima, palabras por elemento |
| Tabla | Filas y columnas que define el administrador | Columnas y su tipo (texto, número, fecha), filas mínimas y máximas |
| Presupuesto | Rubros con montos y el total | Rubros fijos o libres, monto máximo |
| Gráfico (para investigación) | Una tabla con su gráfico | Tipo de gráfico. Se puede dejar para la ficha de investigación |

**Reglas nuevas para el bloque de texto:**
- párrafos mínimos y máximos;
- que termine en punto y que no tenga espacios dobles, que es lo que ya valida `TextoRedaccion`;
- si admite citas APA.

**Qué hay que tocar:**
- `ClaveElemento` y `CATALOGO`;
- la validación de la ficha;
- un formulario por elemento en `/egresado/redactar`, generalizando `TextoEspacioForm`;
- el guardado: `respuestas_espacios.contenido` pasaría a guardar JSON según el elemento, y los archivos se guardan igual que en pasantía;
- la vista de revisión y el PDF de la propuesta (ya pendiente).

Conviene hacerlo **por partes**: primero archivo, imagen y enlace, que reutilizan lo de pasantía; después lista y tabla; al final presupuesto y gráfico.

## 3. Avance: lo que hay que decidir

La nota dice que el avance "no es un campo que el egresado complete", pero el ejemplo dice que "se registra que alcanzó un 70 %". Hay dos formas de llevarlo:

1. **El egresado escribe el avance solo en la actividad (la hoja),** como hoy. El sistema calcula todo lo demás: objetivos, objetivo general, lo que pasa al período siguiente y el Gantt.
2. **El avance de la actividad sale de sus subactividades:** cada una se marca como terminada o no, y el sistema calcula el porcentaje. El egresado nunca escribe un número.

**Recomendación:** la opción 2 cuando la actividad tiene subactividades y la 1 cuando no. Además, que la ficha permita elegir si los niveles promedian igual o **ponderan por presupuesto**: hoy se promedia igual.

## 4. Metodología y dentro o fuera de la universidad (C2)

**Propuesta:** tratarlas como **criterios para elegir la ficha**, igual que la carrera y la facultad que ya usa `versionParaNuevaPropuesta`:
- la ficha declara a qué ámbito aplica (dentro, fuera o ambos) y qué metodologías admite, de una lista que mantiene el administrador;
- al crear la propuesta, el egresado elige el ámbito y la metodología, y el sistema toma la ficha que coincide;
- la cohorte, si el asesor lo confirma, solo dice qué combinaciones se permiten en ese período.

Así, "dentro de la universidad" puede tener su propia ficha (sin carta de aceptación ni empresa, y solo con informe final) sin código especial.

## 5. Orden propuesto

**A. Ajustes pequeños sobre lo hecho:**
1. A1: el marco teórico en "no" para proyecto.
2. A2: el proyecto individual.
3. A3: las actividades incompletas pasan al período siguiente.
4. A4: las evidencias en los registros.
5. A5: la numeración de las imágenes en el informe.

**Estado de A (6-nov-2026): hecho, sin commit.**

**A1.** La plantilla de proyecto trae el marco teórico en "No se pide".
- Las fichas ya habilitadas conservan lo que tenían. PRO-ING-001-SIST v2 sigue en "opcional": hace falta una versión nueva para aplicarlo.

**A2.** Con un solo integrante, `getPlanTrabajo` deja todo el plan a su cargo.
- Antes, en la ejecución el integrante no podía registrar nada: no tenía actividades asignadas.
- El informe pasa a ser uno solo; se ocultan la pestaña Equipo y las tarjetas por integrante.
- Probado con `verificar_fichas.ts`. **Falta probarlo en el navegador**: no hay datos de prueba de un proyecto individual.

**A3.** `arrastradasAlPeriodo`: una actividad con avance < 100 % que no está planificada en el período siguiente aparece ahí para registrar el resto.
- Lleva la etiqueta "Viene del período N con X %" y, en el informe, "continúa del período N".
- Solo se arrastra a períodos ya abiertos; los borradores no cuentan.

**A4.** Evidencias por actividad (tabla `evidencias_plan`, script `crear_evidencias_plan.ts`):
- tres tipos: imagen (PNG o JPG, con pie y origen como en pasantía), PDF de hasta 10 MB y enlace (por ejemplo, un video);
- la ficha define el mínimo y el máximo; la plantilla de proyecto trae de 1 a 5. Las fichas anteriores quedan con 0 a 5, sin mínimo.

**A5.** El informe del período numera las evidencias:
- imágenes: Imagen 1.2.1.1.A, con número correlativo;
- documentos y enlaces: Anexo 1, 2…;
- "Resultados por actividad" enlaza a cada evidencia y la sección de anexos la muestra con su nota de origen.

**Prueba en el navegador, con la propuesta 70 en `dev-fichas`:**
1. Se adelantó la fecha de inicio de la carta, de 2026-11-26 a 2026-10-01, para abrir el período 2.
2. La actividad 1.2.1.1, que quedó al 60 %, apareció en el período 2.
3. Se adjuntaron un enlace, una imagen y un PDF, y se envió al 100 %.
4. El informe individual del período 2 numera las evidencias.
5. `verificar_flujo_proyecto.ts 70` da "Flujo coherente".

**B. Medianos:**
1. B1: el Gantt de avance.
2. B2: la tabla de resultados y evidencias en el informe.
3. B3: la separación entre estructura y comportamiento en el editor.

**C. Grandes (antes, una decisión de diseño):**
1. C1: el catálogo ampliado, por partes.
2. C2: la metodología y el ámbito como criterios de la ficha.

## 6. Preguntas para el asesor

1. ¿El mínimo de OE por participante es 3 o 4?
2. ¿El avance de la actividad lo escribe el egresado, o sale de sus subactividades (§3)? ¿Los niveles ponderan por presupuesto?
3. ¿La "indexación" se refiere a la numeración de las imágenes y al índice del documento, o también a las citas en el texto?
4. ¿Dónde se definen la metodología y el ámbito: en la cohorte, en la ficha o en ambas? ¿Qué metodologías hay?
5. ¿Los videos se suben al sistema o se piden como enlace? Esto pesa por el almacenamiento.

Las preguntas 2 a 5 de [FICHA_PROYECTO.md](FICHA_PROYECTO.md) §7 siguen abiertas, con sus valores por defecto.
