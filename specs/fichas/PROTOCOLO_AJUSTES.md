# Ajustes al protocolo de investigación (notas de la reunión, 19-nov-2026)

Las notas son del usuario y salen de la reunión en la que mostró la ficha de investigación. Este documento responde a los 9 puntos del apartado "Protocolo": qué existe hoy, qué falta y cómo se haría. Las notas de los demás apartados llegarán después.

## 1. Situación actual

- **Apartados con reglas fijas.** El protocolo usa apartados académicos (`lib/fichas/apartadosAcademicos.ts`). Cada tipo trae sus subapartados fijos; por ejemplo, la Problemática tiene situación, estado del arte, pregunta e importancia. Cada subapartado trae sus reglas: mínimo y máximo de palabras, formato y si es opcional.
- **Lo que el constructor permite cambiar de un apartado:**
  - el tipo;
  - la extensión en %, que escala todos los mínimos y máximos a la vez;
  - las citas mínimas;
  - el tiempo verbal;
  - si se revisa la tercera persona;
  - si se muestra la autoevaluación.
- **Lo que el constructor no permite** es activar, desactivar, renombrar ni agregar subapartados, ni cambiar las reglas de uno solo.
- **Citas.** Las referencias son una lista de texto libre en APA. El sistema detecta las citas escritas en el texto y avisa si no aparecen en Referencias, pero no hay registro de fuentes.
  - La pasantía sí tiene uno (`CitaApaCampos`, `lib/citaApa.ts`): se llenan los campos y el sistema arma la referencia APA 7 y la bibliografía.
- **Recursos y presupuesto.** No existen como elementos del protocolo. El plan de investigación tiene el presupuesto apagado, por la respuesta Q4.
- **Documento.** El protocolo no tiene vista de impresión ni Word. Hoy solo el informe final genera portada e índice.

## 2. Respuesta a cada punto

| # | Nota | Hoy | Propuesta |
| --- | --- | --- | --- |
| 1 | Elementos y orden del protocolo; recursos por categoría; índice automático | Faltan recursos, presupuesto y consideraciones éticas, y sobra el esquema del informe | Plantilla nueva (§3), elemento de catálogo "Recursos y presupuesto" (§6) y documento del protocolo con portada e índice automáticos (§7) |
| 2 | Activar o desactivar cada pregunta (subapartado) en la ficha | No se puede | Configuración por subapartado en el constructor (§4) |
| 3 | Que las reglas sean variables en la ficha | Solo la escala general | Reglas por subapartado: mínimo y máximo de palabras, obligatorio, filas o elementos, citas (§4) |
| 4 | Agregar preguntas propias ("Viabilidad técnica") con reglas | No se puede | Subapartados propios en cualquier apartado, con las mismas reglas (§4) |
| 5 | Límite del cuadro de variables | Sin límite | Mínimo y máximo de filas configurable; por defecto, de 1 a 10 (§4) |
| 6 | Fundamentación con citas por párrafo que alimenten la bibliografía | Texto libre; la cita se escribe a mano | Párrafos con su fuente o fuentes en campos APA, como en pasantía; la cita en el texto y la referencia se arman solas (§5) |
| 7 | Metodología variable según el tipo | Fija | Configurable por subapartado (§4), más plantillas cuantitativa, cualitativa y mixta (§4.3) |
| 8 | Quitar "Esquema del informe final" | Existe | Se quita de la plantilla. El formato estándar del informe vendrá después |
| 9 | Referencias: las usadas más otras adicionales, con contador | Lista libre | Se llenan solas con las fuentes citadas; se pueden agregar adicionales en los mismos campos; contador frente al mínimo, 20 por defecto (§5) |

## 3. Plantilla nueva del protocolo

| # | Elemento | Tipo | Notas |
| --- | --- | --- | --- |
| — | Portada, índice y tabla de contenidos | Generados | No son espacios; salen en el documento (§7) |
| 1 | Introducción | Texto | Igual que hoy |
| 2 | Generalidades del estudio | Apartado | Línea UNICAES, contexto y delimitación; se agrega "Resumen del proyecto" |
| 3 | Problemática a investigar | Apartado | Se precarga de la propuesta |
| 4 | Justificación de la investigación | Apartado | Se precarga de la propuesta |
| 5 | Objetivos | Apartado | Se precarga de la propuesta |
| 6 | Fundamentación teórica (marco teórico) | Apartado con párrafos citados | Sube de lugar, antes de la hipótesis (§5) |
| 7 | Hipótesis o supuestos | Apartado | Se renombra; es opcional |
| 8 | Matriz de hipótesis | Tabla | Opcional |
| 9 | Definición de variables o categorías | Apartado | Cuadro de 1 a 10 filas, configurable |
| 10 | Metodología | Apartado | Tipo y enfoque, población y muestra, técnicas e instrumentos, procedimiento y análisis |
| 11 | Consideraciones éticas | Apartado nuevo | Opcional: consentimiento informado, confidencialidad, riesgos |
| — | Cronograma | Generado | Sale del plan de trabajo, que ya se llena junto con el protocolo; no es un espacio |
| 12 | Recursos y presupuesto | Elemento nuevo | Por categoría, con su costo; el presupuesto se calcula solo (§6) |
| 13 | Referencias bibliográficas | Apartado | Mínimo 20; se llenan solas con lo citado (§5) |
| 14 | Anexos | Archivo | Opcional |

Las versiones ya habilitadas no cambian: la plantilla nueva entra en una versión nueva.

## 4. Configuración de subapartados en el constructor (puntos 2, 3, 4, 5 y 7)

### 4.1 Qué se configura

En el constructor, al editar un espacio de tipo apartado, aparece la tabla "Subapartados", con una fila por cada uno:

| Columna | Qué hace |
| --- | --- |
| Activo | Desactivado, no se pide al egresado ni sale en el documento. Por ejemplo, "Estado del arte" en una ficha que no lo pide |
| Título y ayuda | Se pueden renombrar y explicar con las palabras de la facultad |
| Obligatorio | Si es opcional, no bloquea el envío |
| Mínimo y máximo de palabras | Para los subapartados de texto |
| Mínimo y máximo de elementos o filas | Para listas y tablas; por ejemplo, variables de 1 a 10 u objetivos específicos de 3 a 5 |
| Orden | Subir o bajar |

- Con el botón **"Agregar subapartado"** se crean subapartados propios, por ejemplo "Viabilidad técnica" en la Justificación. Llevan título, ayuda, formato (texto, lista o tabla con sus columnas) y las mismas reglas.
- Las revisiones automáticas que ya existen se mantienen y usan estas reglas: tercera persona, tiempo verbal, citas, ¿? en la pregunta y objetivos medibles.

### 4.2 Cómo se guarda

- En los parámetros del espacio se agrega `partes`: una lista con la configuración de cada subapartado, que guarda las diferencias frente al tipo y los subapartados propios.
- El tipo sigue siendo la base: si una ficha no cambia nada, se comporta igual que hoy.
- El contenido del egresado no cambia de forma: es el mismo JSON por subapartado.
- La validación de la ficha revisa que haya al menos un subapartado activo, que mínimo ≤ máximo y que los ids de los subapartados propios no se repitan.
- La lista de cambios entre versiones lo muestra, por ejemplo: "Problemática: se desactivó «Estado del arte»".

### 4.3 Plantillas de metodología

Al elegir el tipo "Metodología", el constructor ofrece tres puntos de partida, que luego se pueden ajustar:

| Enfoque | Subapartados |
| --- | --- |
| Cuantitativa | Enfoque, alcance y diseño · Población y muestra · Técnicas e instrumentos · Procedimiento · Análisis estadístico |
| Cualitativa | Enfoque y diseño · Participantes y criterios de selección · Técnicas e instrumentos · Categorías de análisis · Procedimiento · Análisis de la información |
| Mixta | La unión de las dos, con un subapartado "Integración de los datos" |

## 5. Fuentes, citas y referencias (puntos 6 y 9)

**Registro de fuentes del trabajo.** Es una lista de fuentes con los mismos campos que pasantía: tipo, autores, año, título, editorial o revista, URL… Se reutilizan `CitaApaCampos` y `lib/citaApa.ts`. Se guarda una vez por propuesta y la comparten el protocolo y, más adelante, el informe final.

**Fundamentación teórica:**
- **Esquema de temas:** se mantiene.
- **Desarrollo:** se escribe como una lista de párrafos. En cada uno, el egresado escribe el texto y elige una o más fuentes del registro, o crea una ahí mismo.
- **Cita automática:** el sistema agrega la cita APA al final del párrafo, por ejemplo (Hernández-Sampieri y Mendoza, 2018) o (Pérez et al., 2020).
- **Regla configurable:** "cada párrafo debe citar al menos una fuente", activada por defecto en la fundamentación.
- **Revisión:** avisa si hay párrafos sin fuente o fuentes con más de 10 años.

**Referencias bibliográficas:**
- **Usadas:** se arman solas con las fuentes citadas en cualquier apartado del protocolo, en orden alfabético y sin duplicados. No se editan ahí, sino en el registro de fuentes.
- **Adicionales:** fuentes que se consultaron pero no se citaron, con los mismos campos.
- **Contador:** "14 de 20 referencias". Se pone en ámbar si faltan y en verde al llegar al mínimo; el mínimo es configurable y vale 20 por defecto.
- **Bloqueo:** con menos del mínimo, el protocolo no se envía. Esa es la regla "obligatorio" y se puede convertir en aviso.

**Compatibilidad.** Un protocolo que ya tiene referencias en texto libre las sigue mostrando como "referencias escritas a mano".

## 6. Recursos y presupuesto (punto 1)

**Elemento nuevo del catálogo: "Recursos y presupuesto".** Va en la sección Planificación y se usa en el protocolo.
- **Tabla de recursos**, con una fila por recurso:
  - categoría;
  - descripción;
  - cantidad;
  - costo unitario;
  - total, que se calcula solo.
- **Categorías:**
  - económicos;
  - técnicos o de infraestructura;
  - inmateriales;
  - materiales o consumibles;
  - operacionales;
  - tiempo del investigador o salarios.
  - Cada una tiene su ayuda con los ejemplos de la reunión (laboratorio, internet, reactivos, alquiler por horas, gasolina, horas de trabajo).
- **El presupuesto se calcula solo:** un total por categoría y un total general.

**Parámetros:**
- moneda;
- si se piden costos o solo la lista de recursos;
- qué categorías aplican, todas por defecto;
- mínimo de recursos.

## 7. Documento del protocolo (punto 1: índice automático)

El protocolo tendrá vista de impresión (PDF) y Word, con el mismo formato que el informe final:
- portada;
- índice y tabla de contenidos generados;
- cada apartado con sus subapartados numerados;
- el cronograma tomado del plan de trabajo;
- recursos y presupuesto con sus totales;
- referencias en orden alfabético;
- anexos.

## 8. Entregas propuestas

| Entrega | Contenido | Puntos |
| --- | --- | --- |
| **A** | Configuración de subapartados en el constructor: activar, renombrar, reglas, subapartados propios, orden y plantillas de metodología | 2, 3, 4, 5, 7 |
| **B** | Registro de fuentes, fundamentación por párrafos citados y referencias automáticas con contador | 6, 9 |
| **C** | Elemento "Recursos y presupuesto" y plantilla nueva del protocolo (orden, consideraciones éticas, sin esquema del informe) | 1, 8 |
| **D** | Documento del protocolo (PDF y Word) con portada, índice y cronograma | 1 |

Cada entrega se prueba con una versión nueva de INV-ING-001 y con una propuesta de prueba en protocolo.

## 10. Estado

### Entrega A: hecha el 19-nov-2026, sin commit

**Modelo:**
- `Espacio.partes?: ConfigParte[]`, en `tipos.ts`. Guarda, por subapartado:
  - id, activa, título, ayuda y si es opcional;
  - mínimo y máximo de palabras;
  - mínimo y máximo de elementos o filas;
  - en los subapartados propios, `propia: { formato, columnas }`.
- `partesConfiguradas(e)` devuelve los subapartados en el orden de la ficha, con sus cambios. Los del tipo que la ficha no menciona van al final, activos.
- `tipoApartado(e)` usa solo los activos, así que el formulario del egresado, las revisiones, los pendientes, la limpieza en el servidor y la vista previa respetan la configuración sin tocarlos uno por uno.
- `configInicial(tipo)` es la configuración de partida, sin cambios.
- `configMetodologia("cuantitativa" | "cualitativa" | "mixta")` da los tres puntos de partida de la metodología.

**Reglas:**
- `ParteApartado` tiene `minItems` y `maxItems`.
- `revisarApartado` bloquea (nivel "falta") cuando una lista o una tabla está fuera de sus límites.
- Valores por defecto:
  - objetivos específicos, de 3 a 5, que antes era solo un aviso;
  - cuadro de variables, de 1 a 10 filas.

**Ficha:**
- `problemasPartes`, en `validar.ts`, revisa:
  - que quede al menos un subapartado activo;
  - que los ids no se repitan y que los del tipo existan;
  - que los propios tengan un id "x_…", título y formato válido, y que una tabla tenga de 1 a 8 columnas;
  - que cada mínimo sea menor o igual que su máximo.
- La revisión de la forma de la definición acepta `partes`.
- La lista de cambios entre versiones muestra lo que se activó, se desactivó, se agregó o se quitó, lo que se renombró, los cambios de ayuda y de reglas, y el orden.

**Constructor:**
- `EditorSubapartados.tsx` reemplaza la tarjeta "Campos que se piden" en los apartados. Permite:
  - activar o desactivar con un interruptor (no deja desactivar el último);
  - abrir cada subapartado para cambiar título, ayuda, obligatorio y límites;
  - subir y bajar;
  - agregar subapartados propios de texto, lista o tabla con columnas, y quitarlos;
  - en la metodología, partir de una plantilla cuantitativa, cualitativa o mixta;
  - volver a los subapartados del tipo.
- Al cambiar el tipo de apartado, la configuración se borra.

**Egresado:**
- Las listas y tablas muestran el límite ("1 fila(s) (de 1 a 8)").
- El botón "+ Agregar fila" desaparece al llegar al máximo.

**Pruebas:**
- **verificar_fichas:** 301 comprobaciones, entre ellas la sección 22; "Todo en orden".
- **verificar_flujo 73:** "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador:**
  - en un borrador nuevo (v10) se desactivó «Estado del arte», se agregó «Viabilidad técnica» con su ayuda y reglas, las variables quedaron de 1 a 8 y la metodología pasó a cualitativa;
  - el constructor dijo "Sin problemas" y la lista de cambios mostró cada cambio;
  - se habilitó la versión;
  - con la propuesta 73 ligada a la v10, el egresado ve la Problemática sin el estado del arte, la Justificación con la viabilidad técnica y su ayuda, y el cuadro de variables con el límite.

**Datos de prueba:**
- **INV-ING-001 v10** (id 20): habilitada desde el constructor.
- **Propuesta 73:** ligada a la v10. Sus dos subapartados nuevos se llenaron en la base de desarrollo para que su protocolo, ya aprobado, siga completo.

**Pendientes:** las entregas B (fuentes y citas), C (recursos y plantilla nueva) y D (documento del protocolo).

### Entrega B: hecha el 19-nov-2026, sin commit

**Registro de fuentes:**
- **Tabla:** `fuentes_trabajo`, que crea `scripts/fichas/crear_fuentes_trabajo.ts`. Guarda una fila por fuente, con los campos APA 7 de pasantía (`DatosCitaApa`) en `datos`.
- **Acciones** (`actions/fuentesTrabajo.ts`):
  - `guardarFuente`, que agrega o corrige;
  - `eliminarFuente`;
  - `fuentesDePropuesta`;
  - `recalcularCitas`, que actualiza la cita guardada en cada párrafo cuando una fuente cambia o se quita.
- **Quién edita:** el líder, mientras el protocolo no se haya enviado.

**Módulo puro** (`lib/fichas/fuentes.ts`):
- `citaEnTexto`: "Pérez, 2020", "Pérez y Gómez, 2019" o "Pérez et al., 2014"; si no hay autores, el institucional, y "s.f." si no hay año;
- `citaDeFuentes`: varias fuentes en orden alfabético, separadas por punto y coma;
- `leerParrafos` lee el JSON o, por compatibilidad, el texto libre; `guardarParrafos`;
- `parrafoConCita`: la cita va al final, antes del punto;
- `conCitas`, `referenciasOrdenadas`, `fuentesCitadas` y `leerFuente`.

**Formato nuevo "citado"** (`apartadosAcademicos.ts`):
- **Fundamentación:** el subapartado "Desarrollo" usa este formato.
- **Guardado:** cada párrafo se guarda como `{ texto, fuentes: [ids], cita }`, y el servidor arma la cita al guardar.
- **Revisión:** un párrafo sin fuente bloquea el envío. Es la regla `citaPorParrafo`, que se puede apagar en el constructor.
- **Textos y exportación:** las palabras se cuentan sobre el texto, y al exportar o precargar sale con las citas.
- **Precarga:** la fundamentación pasa al marco teórico del informe final como texto con sus citas.

**Referencias:**
- **Mínimo:** 20 por defecto; se configura en el constructor.
- **Conteo:** suman el registro y las escritas a mano. `ContextoRevision.fuentesReferencias` lleva el registro a las revisiones, a `problemasProtocolo` (que ahora recibe el contexto) y a `verificar_flujo`.
- **Huella:** la del protocolo incluye las fuentes, así que cambiarlas invalida las ratificaciones.

**Pantalla** (`FuentesCitas.tsx`, con el registro compartido por contexto desde `ProtocoloEquipo`):
- **Párrafos:** cada uno con su texto y sus fuentes. Se puede elegir una del registro o crear una ahí mismo con "+ Nueva fuente"; se ve "Así queda" con la cita; se pueden subir, bajar y quitar.
- **Referencias:**
  - el contador "N de 20", en ámbar si faltan y en verde si va bien;
  - las fuentes en orden alfabético con la marca "Citada" o "Consultada", y los botones Corregir y Quitar;
  - "+ Agregar fuente consultada";
  - las referencias escritas a mano, por compatibilidad.

**Pruebas:**
- **verificar_fichas:** 321 comprobaciones, entre ellas la sección 23; "Todo en orden".
- **verificar_flujo:** 71, 72, 73 y 74 dan "Flujo coherente".
- **Tipos y lint:** limpios. Solo queda una advertencia, que ya existía en el script de semillas.
- **En el navegador, con la propuesta 74:**
  - se escribió un párrafo y se creó su fuente ahí mismo; quedó con "(Hernández-Sampieri, 2018)";
  - un segundo párrafo sin fuente quedó marcado como pendiente;
  - al guardar y recargar, todo se conservó;
  - en Referencias: "1 de 20", con la fuente marcada "Citada";
  - se agregó una fuente consultada y quedó en "2 de 20";
  - al corregir el año a 2014, la cita del párrafo cambió sola.

**Datos de prueba:**
- **Propuesta 74:** egresado `inv.citas@prueba.test`, con el protocolo en redacción. Se creó con `sembrar_equipo_investigacion.ts --individual --citas`.
- **Propuesta 73:** 20 fuentes de prueba y su fundamentación en párrafos citados, con `--fuentes-prueba --apartados`.

**Cambio de comportamiento:**
- Las reglas nuevas viven en el tipo de apartado, así que valen para todas las versiones que usan apartados académicos (v3 en adelante):
  - la fundamentación en párrafos citados;
  - el mínimo de 20 referencias;
  - y, desde la entrega A, de 3 a 5 objetivos y de 1 a 10 variables.
- Un protocolo ya aprobado no se reabre, pero si se volviera a editar las pediría.
- Las propuestas 71 y 72 (v1 y v2) no usan apartados y no cambian.

**Pendiente (entrega D):** que el capítulo de bibliografía del informe final y el documento usen también el registro de fuentes.

### Entrega C: hecha el 19-nov-2026, sin commit

**Elemento "Recursos y presupuesto"** (`recursos_presupuesto`, sección Planificación, solo en el protocolo):
- **Módulo puro:** `lib/fichas/recursos.ts`, con `CATEGORIAS_RECURSO`, `reglasRecursos`, `leerRecursos`, `limpiarRecursos`, `presupuesto`, `problemasRecursos` y `formatoMonto`.
  - Las seis categorías traen la ayuda y los ejemplos de la reunión.
- **Parámetros:**
  - si se piden costos (sí, por defecto);
  - moneda (USD);
  - categorías que se piden (todas, por defecto);
  - recursos mínimos (3).
- **Guardado:** `guardarRespuestaRecursos`, en `respuestasEspacios.ts`. Se guardan solo las categorías de la ficha y, si no se piden costos, sin montos.
- **Pendientes:** `problemasProtocolo` revisa el mínimo, la descripción y, con costos, la cantidad y el costo unitario.
- **Pantalla** (`RecursosPresupuestoForm.tsx`):
  - una sección por categoría, con su ayuda, su ejemplo y su subtotal;
  - cada recurso con descripción, cantidad, costo unitario y total;
  - la tabla "Presupuesto" con el total por categoría y el total general.
- **Constructor:** vista previa y campos del elemento.

**Tipos de apartado:**
- **Tipo nuevo:** `consideraciones_eticas`, con consentimiento informado, confidencialidad y uso de los datos, y riesgos y beneficios (este último opcional).
- **Generalidades:** el subapartado nuevo "Resumen del proyecto" es opcional en el tipo, para no cambiar las versiones habilitadas. La plantilla nueva lo pide.

**Plantilla nueva** (`protocoloNuevo`, 14 espacios), en este orden:
1. Introducción.
2. Resumen y generalidades.
3. Planteamiento del problema.
4. Justificación.
5. Objetivos general y específicos.
6. Marco teórico o fundamentación.
7. Hipótesis o supuestos.
8. Matriz de la hipótesis.
9. Variables.
10. Metodología.
11. Consideraciones éticas (opcional).
12. Recursos y presupuesto.
13. Referencias bibliográficas.
14. Anexos.

Ya no lleva "Esquema del informe final". La portada, el índice y el cronograma se generan.

**Pruebas:**
- **verificar_fichas:** 336 comprobaciones, entre ellas la sección 24; "Todo en orden".
- **verificar_flujo:** 71, 72, 73 y 74 dan "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador:**
  - se habilitó la v11, cuya lista de cambios describe cada diferencia con la v10;
  - en la propuesta 74, el paso 12 es "Recursos y presupuesto";
  - con tres recursos en tres categorías, el presupuesto da $50 + $125 + $28 = $203;
  - al guardar y recargar se conservó, y el paso queda completo.

**Datos de prueba:**
- **INV-ING-001 v11** (id 21): habilitada, creada con `--version-protocolo-nuevo`.
- **Propuesta 74:** ligada a la v11.
- **Propuesta 73:** sigue en la v10.

### Entrega D: hecha el 19-nov-2026, sin commit

**Documento del protocolo:**
- `getDocumentoProtocolo`, en `actions/protocolo.ts`. Tiene los permisos del plan de trabajo: el equipo y el asesor.
- Reutiliza el documento del informe final (`documentoInformeFinal.ts`):
  - `portadaInformeFinal(meta, "Protocolo de investigación")`;
  - `apartadosInformeFinal` recibe cualquier etapa con espacios y dos opciones nuevas: `referencias`, que suma las del registro de fuentes a las del apartado de referencias en orden alfabético y sin duplicados, e `insertar`, que agrega apartados numerados antes de un espacio o al final si no existe;
  - el elemento `recursos_presupuesto` se genera con el número que le toca.
- **Partes que genera el sistema** (`lib/fichas/documentoProtocolo.ts`):
  - `bloquesCronograma`: una tabla con el código, el objetivo, la macroactividad o la actividad, y una columna por período con ■ donde se ejecuta;
  - `bloquesRecursos`: n.1 Recursos (categoría, recurso, cantidad, costo unitario y total) y n.2 Presupuesto (total por categoría y total general).
- **Orden:** el cronograma va antes de "Recursos y presupuesto"; si la ficha no lo tiene, antes de las referencias.
- **Estado:** en redacción es una vista previa; enviado, "entregado"; aprobado, "aprobado", con la huella del protocolo.

**Vistas y descarga:**
- Vista de impresión en `/egresado/plan/imprimir?id=` y `/asesor/plan/[id]/imprimir`, con "← Volver al protocolo".
- Word en `/api/protocolo/[id]/word` (`Protocolo_Investigacion_<id>[_borrador].docx`), con el mismo generador del informe final; el título sale de `doc.nombre`.
- La pantalla del protocolo tiene los botones "Vista para imprimir (PDF)" y "Descargar Word".

**Informe final:** su documento también suma las referencias del registro de fuentes a la bibliografía.

**Pruebas:**
- **verificar_fichas:** 345 comprobaciones, entre ellas la sección 25; "Todo en orden".
- **verificar_flujo:** 71, 72, 73 y 74 dan "Flujo coherente".
- **Tipos y lint:** limpios.
- **En el navegador:**
  - propuesta 74, en redacción: portada "PROTOCOLO DE INVESTIGACIÓN", índice con subapartados numerados, "9. Cronograma de actividades", "10. Recursos y presupuesto" con 10.1 y 10.2 ($203) y referencias del registro; las partes vacías aparecen como "Pendiente";
  - el Word se descarga (200, `Protocolo_Investigacion_74_borrador.docx`) y contiene el cronograma y el presupuesto;
  - propuesta 73, vista por el asesor: "Versión aprobada · huella…", cronograma con ■ en cada período y 22 referencias, entre las del registro y las escritas a mano.

**Nota:** la v11 parte de la plantilla, así que no conserva lo que se configuró a mano en la v10 (Estado del arte desactivado, Viabilidad técnica y metodología cualitativa). Esos cambios se pueden volver a hacer en el constructor.

## 9. Decisiones que tomé (se pueden cambiar)

- **Presupuesto:** sale de la tabla de recursos (costo por recurso). El plan de trabajo sigue sin presupuesto, según la respuesta Q4.
- **Registro de fuentes:** se comparte entre el protocolo y el informe final, para no volver a escribir las fuentes.
- **Cita automática:** va al final del párrafo. No se inserta a mitad de oración en esta primera versión.
- **Referencias:** el mínimo de 20 bloquea el envío. La ficha lo puede cambiar a aviso.
