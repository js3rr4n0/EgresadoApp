# Pasantía con ficha (fase 2, «entrega 4» original)

Pedido del usuario (23-nov-2026): que la pasantía funcione como ficha, igual que proyecto e investigación. La fase 1
ya está completa, así que se replican sus elementos y su diseño, pero leyendo la ficha, con las variaciones que el
administrador haga al crearla.

## 1. Regla de convivencia

- **Pasantía con ficha:** al crear una propuesta, toma la versión habilitada de la ficha de pasantía que le corresponde
  (por carrera, facultad o general, y por cohorte, como las otras modalidades). Esa propuesta usa la ficha.
- **Sin ficha:** las propuestas que ya existían y las nuevas cuando no hay ninguna ficha de pasantía habilitada (fuera de
  la base) siguen con el asistente de la fase 1, con sus 7 pasos fijos. Nada cambia para ellas.
- **Datos:** los pasos de la fase 1 guardan donde siempre (`origenFase1`): empresa, supervisor, carta, actividades,
  justificación y documentos. Los pasos nuevos guardan en `respuestas_espacios`, como en proyecto.

## 2. Entregas

| Entrega | Qué | Estado |
|---------|-----|--------|
| **W1** | Propuesta de pasantía desde la ficha | Hecha (23-nov-2026) |
| **W2** | Ejecución de pasantía desde la ficha: duración, períodos, días por período, semanas, límites del registro y páginas mínimas | Hecha (23-nov-2026) |
| **W3** | Contenido del documento final y del informe de período desde la ficha | Hecha (23-nov-2026) |

## 3. W1: lo que se hizo

- **`MODALIDADES_CON_FICHA`:** incluye pasantía (`lib/fichas/fichaDePropuesta.ts`).
- **Asistente (`egresado/redactar/page.tsx`):** con versión de ficha, la pasantía arma sus pasos con el mismo mecanismo
  que proyecto: orden, títulos, descripciones, ayudas y si cada paso es obligatorio. Cada elemento usa su formulario de
  la fase 1:
  - portada → `PortadaForm` (individual);
  - datos empresariales y supervisor → los mismos formularios (seleccionar o solicitar una empresa nueva);
  - carta → `CartaForm` (con la empresa y el supervisor elegidos);
  - cronograma → `ActividadesForm` (con las fechas de la carta);
  - justificación → `JustificacionForm`;
  - documentos → `DocumentosEstudianteForm`.

  Los elementos generales (bloque de texto, lista, imagen, archivo, enlace), los elementos propios y los campos
  adicionales usan los formularios generales, como en proyecto.
- **Avance:** las mismas condiciones de la fase 1 (empresa sin solicitud pendiente, supervisor, carta registrada,
  actividades, justificación), en el orden de la ficha.
- **Formularios de la fase 1:** reciben el paso siguiente y el anterior (por defecto, los de la fase 1). Los botones
  «volver» dicen «Volver al paso anterior».
- **Catálogo:** imagen, archivo, enlace, lista y elementos propios ya tienen formulario en pasantía. La pasantía admite
  campos adicionales. El cronograma sigue exigiendo ir después de la carta, porque usa sus fechas.
- **Vistas de la propuesta:** «Otros apartados de la propuesta» (pasos nuevos, elementos propios y campos adicionales)
  aparece en la vista para imprimir y, ahora también, en la vista previa del egresado, en las tres modalidades
  (`lib/fichas/espaciosExtraPropuesta.ts`, `components/OtrosApartadosPropuesta.tsx`).

**Probado en el navegador:**
1. Ficha PAS-ING-001-QUIM v1 (Ingeniería Química), con un paso nuevo «Objetivos de la pasantía» antes de los documentos.
2. Propuesta 85 (`prueba.empresa@uni.test`) recorrida de la portada a los documentos.
3. La vista previa muestra el paso nuevo.
4. La propuesta 77 (fase 1, sin ficha) sigue con sus 7 pasos fijos.

Para avanzar, a la propuesta 85 se le copiaron las 20 actividades de la propuesta 77.

## 4. Lo que la ficha de pasantía todavía no gobierna

- El envío exige los tres documentos fijos de siempre, no los que marque la ficha en «Documentos que se piden».
- La ejecución (registro semanal, informes mensuales, visita, documento final) sigue con los valores de la fase 1: es
  la entrega W2 y W3.
- Las vistas del asesor y la coordinación muestran la propuesta de pasantía como en la fase 1, más «Otros apartados».

## 5. W2: lo que se hizo (respuestas Q1 y Q2 del 23-nov-2026)

- **Q1:** los valores casi nunca cambian, pero la ficha debe permitir una pasantía «especial». **Q2:** los informes de
  período y el documento final deben ser dinámicos (W3).
- **Origen único:** `lib/reglasPasantia.ts` (`ReglasPasantia`, `reglasDeDefinicion`, `REGLAS_FASE1`) y
  `lib/reglasPasantiaPropuesta.ts` (`reglasPasantiaDePropuesta`). Con versión de ficha, salen de su primera etapa de
  ejecución; sin ella, son los valores de la fase 1. Nada cambia para las pasantías de la fase 1.
- **Lo que lee la ficha:** la duración (períodos × días por período), los períodos, los días por período, las semanas
  (subperíodos), las palabras de la descripción y de la conclusión de cada actividad, las imágenes por actividad y las
  páginas mínimas de cada informe.
- **Dónde se usa:**
  - la carta (fin = inicio + duración; el servidor valida esa duración);
  - el cronograma: períodos, semanas y una actividad mínima por semana;
  - los períodos de la propuesta (`getPeriodosPropuesta`) y la métrica de páginas;
  - los informes de período: uno por período. Los límites salen de la cohorte con la forma de la fase 1 y, en una
    pasantía especial, del inicio del proceso de la cohorte más los días de cada período;
  - el informe final es el del último período, en sus nombres, la portada y el Word;
  - el registro y la revisión de actividades (palabras e imágenes) y los cambios al cronograma.
- **Coherencia en el constructor:** la duración de la carta debe coincidir con la de la ejecución, validación que ya
  existía.
- **Probado en el navegador:**
  1. PAS-ING-001-QUIM v2 (6 períodos de 30 días, 5 semanas, 15 páginas), propuesta 86: la carta pide 180 días, el
     servidor los acepta y el cronograma muestra 6 períodos de 5 semanas, con mínimo 5 actividades.
  2. La propuesta 65 (fase 1) sigue con los informes #1 a #4 y el «Informe final».
- **No probado de punta a punta:** la ejecución de una pasantía especial (aprobar, iniciar y registrar) se verificó
  con el código y las pruebas (sección 47 de verificar_fichas), no en el navegador.

## 6. W3: lo que se hizo

En el constructor, la ejecución de una ficha de pasantía tiene «Documento final e informes»
(`components/fichas/EditorDocumentoFinal.tsx`). Se guarda en `informe.documentoFinal` e `informe.periodo` de la
etapa; sin guardar nada, es la estructura de la fase 1 (`lib/fichas/documentoFinalPasantia.ts`).

- **Documento final:**
  - **Hoja de agradecimientos:** se puede quitar.
  - **Capítulos** (introducción, empresa, actividades, conclusiones): se puede cambiar el título y el orden y quitar
    cualquiera, salvo el de actividades, que es obligatorio.
  - **Capítulos de texto nuevos:** los redacta el egresado, con una indicación y palabras mínimas y máximas. El texto se
    guarda en `informes_mensuales.apartados_extra` (script `scripts/fichas/crear_apartados_extra_informe.ts`).
  - **Anexos** (cronogramas, bitácora, contenido adicional, bibliografía, glosario y carta): se puede cambiar el título y
    el orden y quitarlos; se renumeran solos.
- **Informe de período:** el cronograma del período y los cambios al cronograma se pueden renombrar o quitar. Los datos
  generales y las actividades de cada semana siempre van.
- **Dónde se aplica:**
  - la vista para imprimir y el Word (capítulos, índice y anexos);
  - la pantalla del egresado (oculta lo que se quitó y muestra los capítulos de texto);
  - los requisitos del envío: introducción y carta solo si están, y las palabras de cada capítulo de texto;
  - la aprobación del asesor: sin la carta en la ficha, no hay carta que verificar.
- **Probado en el navegador:**
  1. Ficha PAS-ING-001-QUIM v3 (borrador, id 42): conclusiones renombradas, un capítulo «RECOMENDACIONES A LA EMPRESA»
     antes de ellas, sin glosario y con el cronograma del período renombrado.
  2. Para verla en un documento real, la propuesta 66 (fase 1, terminada) se ligó por un momento a v3 y luego se
     devolvió a sin versión. El documento, el índice, los anexos (la carta pasó a ser el anexo 6), el informe de período
     y el Word siguieron la ficha. La pantalla del egresado mostró el capítulo nuevo y su requisito.
  3. Sin la ficha, el documento de la propuesta 66 tiene la estructura de siempre.
- **Pendiente:** el asesor no tiene una revisión propia de los capítulos de texto. Los ve en el documento y puede pedir
  correcciones del informe, como con el resto.
