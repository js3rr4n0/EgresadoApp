# Módulo de fichas dinámicas — Entrega 2: constructor en el panel de admin

**Objetivo:** que el administrador pueda crear, editar, validar y versionar fichas desde el sistema, en `/admin/bloques-propuestas`.

Los egresados todavía usan el asistente actual: nada de la fase 1 lee las fichas. La pantalla lo avisa con un recuadro.

## 1. Qué se agregó

| Archivo | Qué es |
|---|---|
| `src/app/admin/bloques-propuestas/page.tsx` | Lista de fichas. Reemplaza el "¡Próximamente!". |
| `src/app/admin/bloques-propuestas/[fichaId]/page.tsx` | Carga una ficha y la versión que se muestra (`?v=` para elegir otra). |
| `src/app/actions/fichas.ts` | Acciones del servidor: crear, guardar el borrador, habilitar, crear una versión nueva, retirar, descartar el borrador y editar los datos. Cada una verifica que quien llama sea admin. |
| `src/components/fichas/NuevaFichaModal.tsx` | Diálogo "Nueva ficha": nombre, modalidad, de qué ficha se parte y alcance (facultad y carrera). |
| `src/components/fichas/EditorFicha.tsx` | Editor: pestañas, acciones, problemas y diálogo para habilitar con el resumen de cambios. |
| `src/components/fichas/EditorPropuesta.tsx` | Espacios: agregar desde el catálogo, ordenar (arrastrando o con flechas), configurar y quitar. |
| `src/components/fichas/EditorEjecucion.tsx` | Etapas de ejecución: períodos, registro, revisión, informe e hitos. Admite varias etapas seguidas. |
| `src/components/fichas/VistaPrevia.tsx` | Los pasos como los ve el egresado y el calendario de la ejecución a partir de una fecha de ejemplo. |
| `src/lib/fichas/diferencias.ts` | `compararDefiniciones()`: cambios entre dos versiones, en frases. |
| `src/lib/fichas/validar.ts` | Se agregó `tieneFormaDeDefinicion()`, que revisa el JSON recibido antes de guardarlo. |

No se modificó ningún archivo de la fase 1. El único cambio de comportamiento visible es que `/admin/bloques-propuestas` ya no muestra "¡Próximamente!". Ver el punto D2 de la lista de regresión.

## 2. Reglas del constructor

- **Fichas base** (las 3 de la fase 1): son solo de lectura. Con "Crear ficha a partir de esta" se crea una ficha nueva en borrador.
- **Ficha nueva:**
  - empieza como borrador, copiando la ficha base de su modalidad o una versión de otra ficha de la misma modalidad;
  - queda ligada a su origen, así que "Cambios" muestra las diferencias contra él.
- **Borrador:**
  - se guarda aunque tenga problemas;
  - solo se habilita si `validarDefinicion()` no encuentra ninguno; el servidor lo vuelve a comprobar.
- **Habilitar:** muestra los cambios respecto al origen y pide notas opcionales. Una versión habilitada ya no se edita.
- **Crear versión nueva:** copia la última versión en un borrador nuevo. Solo puede haber un borrador por ficha.
- **Retirar:** marca una versión habilitada como retirada.
- **Descartar borrador:** si la ficha solo tenía ese borrador, se elimina la ficha completa.
- **Modalidad:** no se cambia. Para otra modalidad se crea otra ficha.

## 3. Comprobado (29-oct-2026, base `dev-fichas`)

- **`verificar_fichas.ts`:** 29 de 29 comprobaciones correctas. Se agregaron las de la comparación entre versiones y las del formato del JSON.
- **`tsc --noEmit` y `eslint`:** sin errores en los archivos del módulo.
- **En el navegador, con el admin:**
  - La lista muestra las 3 fichas base.
  - Se creó "Proyecto de Desarrollo de Software" (ficha 4), de Ingeniería en Sistemas, a partir de la base de proyecto.
  - Se agregó el bloque de texto "Antecedentes" (150–400 palabras) y se subió a la posición 4.
  - La validación en vivo:
    - con 8 objetivos mínimos (más que el máximo de 6) muestra el problema;
    - al agregar una ejecución de 4 × 21 días avisa que la carta (150 días) no coincide; con la carta en 84 días el problema desaparece.
  - La vista previa muestra los 9 pasos con sus reglas y el calendario: 4 períodos de 7, 7 y 7 días.
  - "Cambios" muestra 4 cambios respecto a "Proyecto (fase 1)".
  - Se habilitó la versión 1 con notas; después la vista queda de solo lectura.
  - Se creó la versión 2: el resumen contra la versión 1 muestra participantes 1–3 → 1–2 y un hito nuevo. Después se descartó.
  - En la ficha base de pasantía, con inicio el 1-jun-2026, el calendario coincide con el de Kevin en el sistema actual: informes el 30-jun, 30-jul, 29-ago, 28-sep y 28-oct, y visita del 30-ago al 9-sep.
  - En pantalla de 375 px la página no se desborda; las pestañas se desplazan dentro de su barra.

**Datos que quedaron en `dev-fichas`:** la ficha 4, "Proyecto de Desarrollo de Software", con su versión 1 habilitada.

## 4. Guion para mostrarlo en la reunión (unos 10 minutos)

1. **Lista de fichas:** las tres fichas base son el sistema actual descrito como fichas; no se tocan.
2. **Abrir "Pasantía (fase 1)":**
   - recorrer los 7 espacios y la configuración de la carta y del cronograma;
   - en "Ejecución", ver 5 × 30 días, subperíodos 7/7/7/9 y la visita del día 90 al 100;
   - en "Vista previa", poner una fecha de inicio y mostrar el calendario.
3. **"Nueva ficha":** proyecto, Ingeniería en Sistemas, partiendo de la base. Mostrar que empieza como borrador.
4. **Personalizar:**
   - agregar un "Bloque de texto" con límites y arrastrarlo a su lugar;
   - mostrar que los elementos que todavía no existen para proyecto, como el cronograma, aparecen deshabilitados.
5. **Ejecución:** agregar una etapa de ejecución al proyecto y mostrar el aviso de la carta. Corregirlo.
6. **Medicina:** agregar una segunda etapa de ejecución, que inicia al terminar la anterior.
7. **"Cambios" y "Habilitar…":** el resumen en frases de lo que cambió respecto a la base.
8. **"Crear versión nueva":** las versiones habilitadas no se editan. Explicar que en la entrega 3 cada cohorte queda ligada a una versión.

## 5. Preguntas para el asesor que salen del constructor

- **Alcance:** ¿basta con facultad y carrera, o hace falta por cohorte o por área?
- **Participantes:** ¿un rango dentro de la ficha (como ahora) o fichas separadas por número de integrantes?
- **Elementos:** ¿el administrador solo combina los 9 elementos del catálogo, o debe poder crear elementos nuevos?
- **Varias versiones habilitadas a la vez:** al habilitar una versión nueva, ¿la anterior debe retirarse sola, o pueden convivir porque cada cohorte usa la suya?
- **Medicina:** ¿los períodos mensuales son meses de calendario o bloques de 30 días? La vista previa ya calcula ambos casos.

## 6. Siguiente: entrega 3

Versiones y cohortes:
- la columna `propuestas.ficha_version_id`;
- la relación de cada cohorte con la versión que usa;
- elegir las cohortes al habilitar una versión.

Antes de la entrega 4 hay que revisar los pendientes de la pasada 1: el desfase de fechas, las cohortes activas y los nombres de documentos.
