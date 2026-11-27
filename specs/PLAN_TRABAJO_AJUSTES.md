# Plan de trabajo: objetivos fijos de la propuesta y división por períodos

Notas del usuario del 27-nov-2026 (séptimo bloque). Pantalla: «Plan de trabajo» del egresado
(`components/proyecto/PlanTrabajoEquipo.tsx`, `actions/planTrabajo.ts`). Diseño de la universidad, sin emojis.

## 1. Cómo funciona hoy

| Punto | Hoy | Dónde |
|-------|-----|-------|
| Carga desde la propuesta | Solo **una vez**, cuando alguien abre el plan por primera vez: el objetivo general y el **título corto** de cada objetivo específico (no la descripción, que es el objetivo redactado). Si la propuesta cambia después (por ejemplo, ajustes del asesor), el plan no se entera. | `arbolInicial` |
| Objetivo general | Solo lectura. | |
| Objetivos específicos | Se pueden **renombrar, quitar y agregar** («+ Objetivo» en el objetivo general). En la base hay planes con objetivos agregados: la 70 y la 71 tienen cinco «Objetivo de prueba» de más. | `puedeEditar`, `puedeAgregar`, `puedeQuitar` |
| Macroactividades y actividades | Se agregan y editan (está bien). | |
| Productos esperados (por objetivo) y documento (por actividad) | Se escriben si la ficha los pide. Se muestran con emojis. | |
| Períodos | Con la ficha por subperíodos (la de proyecto lo está), la tabla muestra **un período a la vez** y se cambia con una lista desplegable pequeña («Período 1»). Nada avisa que hay más períodos ni cuántas actividades tiene cada uno, así que es fácil llenar todo en el período 1. La validación tampoco revisa que cada período tenga actividades. | líneas del selector «Período» |

Hecho en este mismo pedido: se borraron los formularios que ya no se usaban (`DescripcionProblemaForm`,
`JustificacionProyectoForm`, `AlcanceProyectoForm`).

## 2. Entregas

### P1. Objetivos fijos desde la propuesta
- El objetivo general y cada objetivo específico se muestran **tal como se redactaron en la propuesta** (título y
  descripción), en solo lectura. No hay «+ Objetivo», «Quitar» ni campo de texto en los objetivos.
- Mientras el plan se puede editar (en redacción u observado), al abrirlo se **sincroniza** con la propuesta: si los
  objetivos cambiaron, se actualiza su texto y sus macroactividades y actividades se conservan (por posición).
- El servidor rechaza guardar un plan con objetivos distintos a los de la propuesta (agregados, quitados o
  renombrados), por si alguien lo intenta desde otra pestaña.
- Se siguen pudiendo agregar macroactividades y actividades, y escribir los productos esperados y los documentos si la
  ficha los pide.

**Hecha (27-nov-2026).**
- Reglas puras en `lib/fichas/planTrabajo.ts`: `sincronizarObjetivos` (objetivo general y específicos de la propuesta, en
  su cantidad y orden; conserva por posición id, responsable, productos, macroactividades y actividades; quita los de
  más; deja el bloque de preparación del informe al final) y `objetivosCoinciden`.
- `actions/planTrabajo.ts`:
  - `arbolInicial` arma el plan con esas reglas (antes copiaba solo el título corto y dejaba el título vacío si no
    había).
  - Al abrir un plan en redacción u observado, si sus objetivos no coinciden con la propuesta, se sincroniza y se guarda
    (sube la versión). Los planes enviados, aprobados o en ejecución no se tocan (respuesta 2).
  - Guardar rechaza un plan con objetivos distintos a los de la propuesta.
  - `DatosPlan.objetivosPropuesta` lleva el general y los específicos (título y descripción) para mostrarlos.
- `PlanTrabajoEquipo.tsx`: los objetivos específicos se muestran en solo lectura con el título y, debajo, la
  descripción de la propuesta (respuesta 4); sin «+ objetivo» en el objetivo general ni «Quitar» en los objetivos (también
  en investigación, respuesta 1). El líder sigue asignando el responsable de cada objetivo. Sin emojis en productos y
  documentos.
- `verificar_fichas.ts`: 4 comprobaciones nuevas (todo en orden).
- Probado con el plan de la propuesta 70 puesto en redacción por un momento: al abrirlo quedaron los 3 objetivos de la
  propuesta con su descripción (se quitaron los 6 de más) y sin botones para agregar o quitar objetivos. Restaurado tal
  cual (aprobado, versión 5).

### P2. División del plan por períodos
- En lugar de la lista desplegable, **pestañas por período** («Período 1», «Período 2», …) siempre visibles arriba de la
  tabla, cada una con cuántas actividades tiene programadas; las que no tienen ninguna se marcan («Sin actividades»).
- Una línea de ayuda que explique: «Marca en qué semanas de cada período se ejecuta cada actividad. Revisa todos los
  períodos: el plan cubre toda la duración del trabajo».
- En cada actividad, una indicación de en qué períodos ya está programada (por ejemplo, «P1, P3»), para verla sin
  cambiar de pestaña.
- Opción «Ver todos los períodos» para quien prefiera la tabla completa.
- Validación al enviar: ver pregunta 3.
- Quitar los emojis de productos y documentos.

**Hecha (27-nov-2026).**
- Reglas en `lib/fichas/planTrabajo.ts`: `actividadesPorPeriodo` (actividades programadas en cada período) y
  `problemasPeriodos` («No hay actividades programadas en los períodos 3, 4 y 5…»). La regla se suma a las de la ficha
  en la pantalla y en `enviarPlanTrabajo` (respuesta 3).
- `PlanTrabajoEquipo.tsx`: pestañas «Período N» siempre visibles con «N actividades» o «Sin actividades» (en ámbar),
  la activa en rojo y «Ver todos» (columnas P1·S1, P1·S2…). Con la ficha por períodos (sin subperíodos) las pestañas son
  solo un resumen. Texto de ayuda arriba de la tabla. En cada actividad, «Programada en: P1, P2» o «Sin programar en
  ningún período». Se quitó la lista desplegable de período.
- `verificar_fichas.ts`: 2 comprobaciones nuevas (todo en orden).
- Probado con el plan de la propuesta 70 puesto en redacción: P1 con 3 actividades, P2 con 1, P3 a P5 «Sin
  actividades», el pendiente nuevo en la lista y «Ver todos» con las 20 columnas.
- **Corrección encontrada al probar:** la sincronización de P1 escribía con la condición de la versión solamente; una
  lectura hecha mientras el plan estaba en redacción terminó de escribir después de restaurarlo y dejó el plan de la
  70 sincronizado estando aprobado. Ahora la escritura exige además que el plan siga en redacción u observado (también
  al guardar). El plan de la 70 se devolvió a su original exacto (aprobado, versión 5) y el de la 82 estaba intacto.

## 3. Preguntas

1. **¿Aplica también al cronograma de investigación?** Ahí los objetivos también vienen de la propuesta. Propuesta: sí,
   las mismas reglas.
2. **Planes ya existentes con objetivos agregados o cambiados** (la 70 y la 71 están en ejecución): propuesta: la
   sincronización solo toca los planes que todavía se pueden editar; los aprobados o en ejecución se dejan como están.
3. **¿Cada período debe tener al menos una actividad para poder enviar el plan?** Propuesta: sí, como regla al enviar
   (si un período queda vacío, el envío lo indica).
4. **Texto del objetivo en el plan:** propuesta: título en negrita y la descripción debajo, igual que en la propuesta.

**Respuestas del usuario (27-nov-2026):** de acuerdo con las cuatro propuestas (también investigación; solo se
sincronizan los planes editables; cada período con al menos una actividad para enviar; título y descripción).

## 4. Orden sugerido

P1 → P2.
