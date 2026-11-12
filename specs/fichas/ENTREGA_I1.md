# Entrega I1: constructor con la ficha de investigación completa (12-nov-2026)

Ruta y contexto: [FICHA_INVESTIGACION.md](FICHA_INVESTIGACION.md).

**Respuesta aplicada:** Q1, la investigación **sí pide carta de aceptación**. La ejecución sigue empezando en la fecha de la carta, como en proyecto.

## Qué se hizo

**1. Etapa nueva "Protocolo"** (`EtapaProtocolo` en `lib/fichas/tipos.ts`):
- Va entre la propuesta y el plan de trabajo. Por ahora es solo para investigación.
- Sus espacios son elementos del mismo catálogo que la propuesta.
- **Revisión:** el plazo del dictamen (5 días por defecto), si se cuentan días hábiles (sí por defecto) y si el equipo ratifica antes de enviar (sí por defecto).
- **Un texto del protocolo puede precargarse** con una respuesta de la propuesta (`Espacio.precargarDe`). La plantilla precarga la problemática, la justificación y los objetivos.
- La plantilla `protocoloNuevo()` trae las 15 partes del contexto. La portada y el índice se generan, y el cronograma de actividades es el plan de trabajo, así que ninguno de los tres es un espacio.

**2. Elemento "Tabla"** (catálogo ampliado, parte 2):
- Las columnas las escribe el administrador. Es un parámetro nuevo, de tipo `textos`, con su editor en el constructor.
- También define las filas mínimas y máximas.
- Por ahora solo se puede usar en el protocolo de investigación, por ejemplo para la matriz de hipótesis.
- Las reglas, la lectura y la validación de las filas están en `elementosRecurso.ts`. El formulario del egresado se hará en I3.

**3. Elementos por etapa** (`ElementoCatalogo.etapas`):
- Portada, empresa, supervisor, carta, cronograma, actores, objetivos y documentos solo van en la propuesta.
- La tabla solo va en el protocolo.

**4. Recursos en investigación:** imagen, archivo, enlace y lista ya se pueden usar en investigación. El asistente que los lee se conecta en I2.

**5. Plan de trabajo:**
- Campo nuevo `documentoSolicitado` ("no", "opcional" u "obligatorio"): cada actividad declara el documento que entregará como prueba.
- En investigación viene en "obligatorio". En proyecto no cambia: falta el campo y se lee "no".
- Si la ficha tiene protocolo, el plan se inserta después de él.

**6. Ejecución de investigación** (`ejecucionNueva`):
- El marco teórico viene en "opcional".
- Trae el hito "Presentación de los resultados" (días 141–150).
- Todo lo demás es igual que en proyecto.

**7. Validación:**
- El orden de las etapas es: propuesta → protocolo → plan → ejecución.
- Solo puede haber un protocolo, y necesita un plan de trabajo.
- Se revisan los elementos permitidos en cada etapa.
- Se revisa la precarga: solo en el protocolo, solo en textos, y desde un texto o los objetivos que exista en la propuesta.
- Se revisan las columnas de la tabla: ninguna vacía, sin repetidas, de 1 a 8.
- Se revisa la forma del JSON.

**8. Cambios entre versiones:**
- Se comparan el protocolo (sus espacios, el plazo y la ratificación) y el documento solicitado.
- La comparación de espacios se comparte entre la propuesta y el protocolo.

**9. Constructor:**
- Pestaña **Protocolo** con "+ Agregar protocolo y plan de trabajo". Tiene las secciones Estructura y Comportamiento, y debajo el editor de espacios (`EditorPropuesta` con `tipoEtapa="protocolo"`), con la tarjeta "Precarga desde la propuesta".
- La **Vista del egresado** muestra el protocolo paso a paso, con la nota de precarga.
- La franja de etapas de la pestaña Ejecución incluye el protocolo.

## Pruebas

`scripts/fichas/verificar_fichas.ts`: **117 comprobaciones**, todas correctas. Hay 26 nuevas, en la sección 13:
- la ficha completa es válida y conserva su forma;
- las partes y la precarga del protocolo;
- el plazo hábil y el documento solicitado;
- el marco teórico y el hito de presentación;
- que proyecto no cambie;
- 10 errores detectados: el orden, el protocolo sin plan, el protocolo en proyecto, dos protocolos, un elemento en la etapa equivocada, la precarga inválida o en la propuesta, columnas repetidas y el plazo;
- la lectura y la validación de las filas;
- los cambios al habilitar.

`tsc` y `eslint` (fichas) están limpios.

**En el navegador (`dev-fichas`, admin):** se creó **INV-ING-001-SIST** (Ingeniería en Sistemas, ficha 8, versión 1 en **borrador**).

**Propuesta, 8 pasos:**
1. Portada.
2. Carta.
3. Problema.
4. Justificación.
5. Objetivos.
6. **Descripción narrativa de los objetivos** (nueva).
7. Actores.
8. Documentos.

**Protocolo:** 15 espacios. La matriz de hipótesis tiene 3 columnas: Hipótesis, Variables e Indicadores.

**Plan de trabajo:** pide el documento solicitado (obligatorio).

**Ejecución:** 5 × 30 días, con la presentación de resultados.

**Hitos previos:** el dictamen de la propuesta y el dictamen del plan (protocolo + plan).

**Comprobado en pantalla:**
- **Pestaña Protocolo:** la tabla marca una columna vacía como problema y deja de marcarla al escribirla.
- **Vista del egresado:** muestra las reglas de la tabla y la nota de precarga.
- **Pestaña Cambios:** lista 5 cambios respecto a INV-BASE.
- **PRO-ING-001:** sigue sin la pestaña Protocolo.
- **Consola:** sin errores.

Se deja en borrador para habilitarla en I2, cuando el asistente la lea. Así no se crea una versión 2 si hay que ajustarla.

## Pendiente para las siguientes entregas

- **I2:** la propuesta de investigación usa la ficha (`MODALIDADES_CON_FICHA`) y se retira el asistente escrito a mano.
- **I3:** la redacción del protocolo (con la precarga y el formulario de la tabla), la ratificación y el dictamen del asesor en días hábiles. El plan de trabajo pide el documento solicitado por actividad.
- **Dudas abiertas:** Q2 (alcance), Q3 (descripción narrativa: un texto o uno por objetivo), Q4 (presupuesto, hoy activo), Q5 (columnas de la matriz), Q7 y Q8.
