# Catálogo editable (H5)

**Decisión del 20-nov-2026:** el catálogo de elementos **debe** permitir crear elementos y editar sus campos. Es un paso
esencial del creador de fichas. Hoy el catálogo es de solo lectura: "+ Nuevo elemento" y "Editar campos" están
deshabilitados, y los 19 elementos están escritos en el código (`src/lib/fichas/catalogo.ts`).

## 1. Situación actual

- Cada elemento (portada, objetivos, texto, archivo, apartado académico…) tiene **su propio formulario** en el
  asistente del egresado y sus propias reglas. Por eso no se puede crear un elemento nuevo desde la pantalla: el sistema
  no sabría cómo mostrarlo ni cómo guardarlo.
- "Campos que llena el egresado" es una lista informativa (`disenoFuturo.ts`): no se usa en los formularios.
- Las fichas guardan sus espacios en la definición de cada versión, así que una versión habilitada no cambia.

## 2. Propuesta

### Elementos propios

Un **elemento propio** es un formulario armado con campos de tipos conocidos. Por eso el sistema puede mostrarlo sin
programar nada nuevo.

- **Datos del elemento:**
  - nombre, sección del catálogo, descripción;
  - etapas donde se puede usar (propuesta, protocolo, informe final);
  - una respuesta por trabajo o una por integrante.
- **Campos**, en orden, cada uno con:
  - **etiqueta y ayuda**;
  - **obligatorio u opcional**;
  - **tipo:** texto corto, texto largo, número, fecha, selección (con sus opciones), lista, archivo, imagen o enlace;
  - **límites:** palabras, mínimo y máximo de elementos, tamaño de archivo.
- **Estado:** borrador o publicado. Solo los publicados se pueden agregar a una ficha.
- **Guardado:** se guarda en una tabla nueva (`elementos_catalogo`).
- **Al agregarlo a una ficha** se copia su definición en el espacio. Si después se edita el elemento, las fichas que ya
  lo usan no cambian; para tomar el cambio hace falta una versión nueva de la ficha (la misma regla que el resto del
  constructor).

### Editar campos de los elementos existentes

Los elementos del sistema tienen campos de los que dependen otras partes: la portada da el carnet, los objetivos dan
el plan y la carta da las fechas. Por eso se propone:

- cambiar la **etiqueta, la ayuda y si es obligatorio u opcional** de cada campo, por ficha;
- **agregar campos adicionales** al final del elemento, con los mismos tipos de los elementos propios;
- no quitar ni cambiar el tipo de los campos de los que depende otra parte del sistema. La pantalla los marca como
  "campo del sistema".

### Dónde se usan

Se usan en el asistente de la propuesta, en el protocolo y en el informe final, cada uno con un formulario general que
dibuja los campos. El asesor los ve en su revisión, y aparecen en la vista previa, en las diferencias entre versiones y
en el documento exportado.

## 3. Entregas propuestas

| Entrega | Qué incluye |
|---|---|
| **C1** | Tabla `elementos_catalogo` y la pantalla del catálogo: "+ Nuevo elemento", el editor de campos (agregar, ordenar, tipo, límites), borrador y publicado. |
| **C2** | Usar el elemento en el constructor: agregarlo a una ficha (copia de la definición), validación al habilitar, vista previa y diferencias entre versiones. |
| **C3** | El formulario general en propuesta, protocolo e informe final: guardado en `respuestas_espacios`, revisión del asesor, documento e impresión. |
| **C4** | Editar los campos de los elementos del sistema: etiqueta, ayuda, obligatorio y campos adicionales, por ficha. |

## 4. Preguntas

- **Q1.** ¿Quién crea y edita elementos? Se propone el **administrador**; la coordinación solo los usa en sus fichas.
- **Q2.** ¿Un cambio en un elemento debe llegar a las fichas que ya lo usan? Se propone que **no**: llega a las
  versiones nuevas, y las habilitadas no cambian.
- **Q3.** ¿Alcanzan los tipos de campo de la lista? ¿Falta alguno, por ejemplo una tabla o una firma?
- **Q4.** ¿Está bien limitar la edición de los elementos del sistema a etiqueta, ayuda, obligatorio y campos
  adicionales?

## 5. Entrega C1: hecha (20-nov-2026)

Aprobada el 20-nov ("Sí, empieza C1"). Las preguntas Q1–Q4 quedan con lo propuesto mientras no se diga otra cosa:
solo el administrador, sin propagar cambios a las fichas que ya usan el elemento, los 9 tipos de campo, y la edición de
los elementos del sistema limitada (C4).

- **Datos:** tabla `elementos_catalogo` (`src/lib/schema.ts`), creada en desarrollo con
  `scripts/fichas/crear_elementos_catalogo.ts` (idempotente). Tiene nombre, estado (borrador o publicado), definición
  (jsonb) y fechas.
- **Reglas** (`src/lib/fichas/elementosPropios.ts`, módulo puro):
  - 9 tipos de campo: texto corto, texto largo, número, fecha, selección, lista, archivo, imagen y enlace;
  - límites por tipo;
  - pendientes para publicar: nombre, sección, etapas, al menos un campo y uno obligatorio, etiquetas únicas, dos
    opciones o más en una selección, mínimos no mayores que los máximos, de 1 a 10 MB, y hasta 20 campos;
  - una revisión de la forma de lo que se guarda.
- **Acciones** (`src/app/actions/elementosCatalogo.ts`, solo para el administrador):
  - crear, guardar y publicar;
  - volver a borrador;
  - eliminar, solo un borrador.
  - Un elemento publicado no se puede guardar con pendientes.
- **Pantalla** (Fichas → Catálogo de elementos):
  - "+ Nuevo elemento" crea un borrador y abre su editor (`EditorElementoPropio.tsx`).
  - En el editor se cambian los datos del elemento (nombre, descripción, sección, respuestas por trabajo o por
    integrante, etapas y si se repite).
  - Los campos tienen etiqueta, tipo, obligatorio, ayuda y límites, y se pueden ordenar o quitar.
  - El editor muestra los pendientes y una vista previa de cómo lo llenará el egresado.
  - Los elementos propios aparecen en su sección del catálogo como "Propio · borrador" o "Propio · publicado".
- **Pruebas:** sección 32 de `verificar_fichas`. En el navegador se creó y publicó «Ficha técnica del prototipo», con
  3 campos: texto largo, selección Web/Móvil y archivo. Quedó publicado como ejemplo.
- **Todavía no:** agregarlo a una ficha (C2), el formulario del egresado (C3) y editar los elementos del sistema (C4).

## 6. Entrega C2: hecha (20-nov-2026)

- **Modelo:**
  - Elemento nuevo `"propio"` en `ClaveElemento`, con un genérico en `CATALOGO` (`formularioEn: []` hasta C3), oculto
    en el catálogo y en "Agregar espacio". `ELEMENTOS_SISTEMA` lista los demás.
  - El espacio guarda `propio: { elementoId, definicion, copiadoEn }`. Las funciones están en `elementosPropios.ts`:
    `copiaDe`, `tieneFormaCopia`, `mismaDefinicion` (no depende del orden de las claves de jsonb) y
    `cambiosElementoPropio`.
- **Constructor:**
  - En propuesta, protocolo e informe final, "Agregar espacio" tiene una fila **Elementos propios** con los publicados
    que admiten esa etapa. Un elemento no repetible se ofrece una sola vez.
  - El panel del espacio muestra los campos de la copia y la fecha en que se copió.
  - Si el elemento cambió en el catálogo, aparece el aviso con **Actualizar la copia** (solo en un borrador). Si ya no
    está publicado, se avisa que la ficha conserva su copia.
  - Los publicados llegan al constructor por contexto (`ContextoElementosPropios.tsx`), cargados en
    `[fichaId]/page.tsx`.
- **Validación al guardar y habilitar:**
  - el espacio lleva una copia válida y sin pendientes;
  - la etapa es una de las que admite el elemento;
  - un elemento no repetible aparece una sola vez;
  - la revisión de forma de la definición acepta la copia.
- **Vista previa y Cambios:**
  - La vista del egresado dibuja los campos de la copia con sus reglas.
  - La pestaña Cambios dice qué campos se agregaron, se quitaron o cambiaron, y si cambió el orden o el elemento.
- **Asistente del egresado:** mientras no exista C3, el paso se muestra como "no disponible", como los demás
  elementos sin formulario, y no bloquea el envío. El constructor lo marca "sin formulario en el asistente".
- **Pruebas:**
  - Sección 33 de `verificar_fichas`.
  - En el navegador:
    - se creó un borrador v2 de PRO-ING-002-SOFT y se le agregó «Ficha técnica del prototipo»;
    - se guardó, y se revisaron Cambios y la vista del egresado;
    - se cambió el elemento en el catálogo (texto largo de 500 a 300 palabras), apareció el aviso y se actualizó la
      copia;
    - después se descartó el borrador.
- **Sigue:** C3 (formulario del egresado) y C4 (editar los elementos del sistema).

## 7. Entrega C3: hecha (20-nov-2026)

- **Respuestas** (`src/lib/fichas/respuestasPropias.ts`, módulo puro):
  - **Forma del JSON:** `{ valores }`, o `{ integrantes: { <usuarioId>: valores } }` si es una respuesta por integrante.
    Se guarda en `respuestas_espacios` (propuesta y protocolo) o en la versión del capítulo (informe final).
  - **Limpieza al guardar:**
    - solo los campos del elemento, con su tipo;
    - el número se convierte y la fecha debe ser AAAA-MM-DD;
    - una opción que no existe se descarta;
    - los archivos van como data URL: PDF, Word o Excel; las imágenes en PNG o JPG; todos dentro del límite de MB.
  - **Pendientes:** los obligatorios, las palabras, los mínimos y máximos y los enlaces válidos. Por integrante, cada
    pendiente lleva el nombre de quien lo tiene.
  - **Funciones para mostrar:** `bloquesRespuesta`, `archivosRespuesta` y `textoCampo`.
- **Formulario** (`components/proyecto/CamposPropios.tsx`): un campo por tipo, con la regla debajo.
  - **Propuesta y protocolo** (`PropioEspacioForm.tsx`): con "Guardar borrador" y "Guardar y continuar", que guarda
    aunque falten datos y no avanza mientras falten.
    - Por trabajo lo redacta el líder.
    - Por integrante, cada uno llena su parte y ve la de los demás.
    - El asesor lo ve sin editar.
  - **Informe final** (`CapituloPropio`): edita el capítulo con versiones y autoguardado. Por integrante, cada uno
    edita solo su sección.
- **Servidor:**
  - `guardarRespuestaPropia` (en `actions/respuestasEspacios.ts`): un integrante aceptado puede guardar su parte.
  - El capítulo del informe final se limpia con `limpiarRespuesta`.
  - El envío de la propuesta revisa el paso con la parte de cada integrante (`espacioFichaIncompleto`).
  - El protocolo y el informe final lo revisan con `problemasProtocolo`, que recibe los integrantes.
  - Para avanzar en el asistente basta la parte de quien redacta.
- **Revisión y documentos:**
  - La impresión de la propuesta (la que abren el asesor y la coordinación) tiene **"Otros apartados de la
    propuesta"**, con los bloques de texto nuevos y los elementos propios. Antes los bloques de texto nuevos no se
    veían.
  - En el protocolo y el informe final exportados, cada campo sale con su etiqueta, y los archivos pasan a los anexos.
- `CATALOGO.propio.formularioEn` = proyecto e investigación. El asistente de pasantía sigue siendo el de la fase 1.
- **Pruebas:**
  - Sección 34 de `verificar_fichas`.
  - `verificar_flujo` 71–76 coherente.
  - En el navegador:
    - se habilitó la **v2 de PRO-ING-002-SOFT** con «Ficha técnica del prototipo» antes de Documentos;
    - con `inv.lider.demo` se creó la **propuesta 80** (proyecto) y se llenó el paso (texto, selección y un PDF);
    - se guardó, se recargó y los datos seguían ahí;
    - con la descripción vacía, el formulario avisó qué faltaba y no avanzó;
    - la impresión de la propuesta mostró los tres campos;
    - después se **deshabilitó la v2**: la DEMO sigue en la v1, y la propuesta 80 queda como dato de prueba.
- **No probado en el navegador:** el protocolo y el informe final con un elemento propio, y la respuesta por
  integrante. Las pruebas automáticas cubren su lógica.
- **Límite conocido:** en el informe final, el servidor no impide que un integrante cambie la parte de otro; lo impide
  la pantalla. El historial de versiones conserva cada cambio con su autor.

## 8. Entrega C4: hecha (20-nov-2026), con un cambio de alcance

**Qué se hizo: campos adicionales en los elementos del sistema.**
- **Modelo:** `Espacio.camposExtra` lleva campos de los mismos 9 tipos de los elementos propios. Las funciones
  `problemasCampos`, `tieneFormaCampos`, `defCamposExtra` y `claveCamposExtra` están en `elementosPropios.ts`.
- **Dónde se permiten:** solo en la propuesta y el protocolo de proyecto e investigación, en portada, actores, carta,
  texto, objetivos, imagen, archivo, enlace, lista, tabla y recursos (`ELEMENTOS_CON_CAMPOS_EXTRA`).
- **Dónde no:** en el informe final se usa un elemento propio. En pasantía, el asistente sigue siendo el de la fase 1.
  En documentos, apartados y elementos propios tampoco.
- **Constructor:**
  - El panel del espacio, en "Campos que se piden", marca cada campo del elemento como **"Campo del sistema"**.
  - Debajo está **"Campos adicionales"**, con el mismo editor de campos del catálogo (`EditorCampos`, extraído de
    `EditorElementoPropio.tsx`).
  - La validación, la revisión de forma, la pestaña Cambios y la vista del egresado los incluyen.
- **Egresado:** debajo del formulario del paso aparece **"Datos adicionales: …"** (`CamposExtraForm.tsx`), con su
  botón de guardar.
  - Lo redacta el líder y los demás lo ven.
  - La respuesta va en `respuestas_espacios` con la clave `<id>#extra`, así que cambiarla también invalida las firmas.
  - Cuenta para avanzar en el asistente, al enviar la propuesta (también en los pasos de la fase 1) y en los
    pendientes del protocolo.
- **Revisión y documentos:**
  - La impresión de la propuesta muestra "<paso>: datos adicionales".
  - En el protocolo exportado van bajo el subtítulo "Datos adicionales" de su apartado.
- **Pruebas:**
  - Sección 35 de `verificar_fichas`.
  - En el navegador:
    - se creó un borrador v3 de PRO-ING-002-SOFT y se agregó «Repositorio del código» a "Objetivos del proyecto";
    - con la etiqueta vacía apareció un problema, y se quitó al escribirla;
    - se revisaron Cambios y la vista del egresado;
    - el borrador se descartó.
  - El formulario del egresado reusa los campos ya probados en C3, pero no se probó en el navegador con una ficha
    habilitada.

**Lo que cambió respecto del diseño (Q4):** no se cambian la etiqueta, la ayuda ni si es obligatorio cada campo de un
elemento del sistema.
- Esos campos están escritos en los formularios de la fase 1 (portada, carta, objetivos…), y otras partes dependen de
  ellos.
- Cambiarlos campo por campo obliga a tocar cada formulario y sus reglas, con riesgo para los procesos en curso.
- Lo que ya se configura por ficha sigue igual: el título, la descripción y la ayuda del paso, si es obligatorio y sus
  reglas (parámetros).
- Si hace falta cambiar un campo del sistema en particular, se puede hacer como un ajuste puntual de su formulario.
