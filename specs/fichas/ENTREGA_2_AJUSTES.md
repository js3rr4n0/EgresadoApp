# Entrega 2 — Ajustes de diseño para la presentación (30-oct-2026)

Respuesta a las observaciones sobre el constructor de fichas.

**Criterio:** aunque las funciones se desarrollan por entregas, el diseño visual ya muestra el módulo completo. Las partes que todavía no funcionan se marcan con la etiqueta "Próximamente" (morada) y con un aviso al inicio de su pestaña. Se pueden explorar, pero no se guardan.

Por ahora el trabajo se centra en la **pasantía estándar**. Los elementos de proyecto, investigación, especialización y otras modalidades se ajustarán cuando se definan.

## Qué funciona y qué es solo de diseño

| Parte | Estado |
|---|---|
| Código y nombre automáticos de la ficha | **Funciona** (se guarda) |
| Tabla de fichas: filtros por estado y modalidad, y buscador | **Funciona** |
| Columnas Cohortes y Procesos | Diseño: se llenan en las entregas 3 y 4 |
| Modalidades Mixta y Especialización | Diseño: visibles y deshabilitadas |
| Catálogo de elementos (consulta) | **Funciona**, solo lectura |
| Crear o editar elementos y sus campos | Diseño (entrega posterior) |
| Interruptor "Constructor / Vista del egresado" | **Funciona** |
| Propuesta: espacios, contenido y reglas | **Funciona** (se guarda) |
| Propuesta: "Campos que se piden" de cada elemento | Diseño (entrega posterior) |
| Ejecución: períodos, registro, revisión, informe e hitos | **Funciona** (se guarda) |
| Hitos con tipo (antes de iniciar o durante la ejecución) | **Funciona** (se guarda) |
| Línea de tiempo y calendario de ejecución | **Funciona** (se calculan al editar) |
| Cierre: estructura del informe final y portadas con logotipo | Diseño (entrega 6) |
| Presentación de revisión y Presentación pública | Diseño (entrega posterior) |
| Roles | Diseño (entrega 7) |
| "Deshabilitar" una versión (antes "Retirar") | **Funciona** |

## Respuestas a las observaciones

### 1. Nombre automático

La ficha ya no pide nombre. Se eligen las generalidades y el sistema genera:

- **Código** `MOD-FAC-NNN[-CAR]`, por ejemplo `PAS-ING-001-SIST`. Las partes son:
  - **MOD:** la modalidad (PAS pasantía, PRO proyecto, INV investigación, MIX mixta, ESP especialización);
  - **FAC:** el código de la facultad registrado en "Facultades y carreras" (ING, MED…), o GEN si es para todas;
  - **NNN:** un correlativo por modalidad y facultad;
  - **CAR:** el código de la carrera, solo si la ficha es de una carrera.
- **Nombre:** "Pasantía · Ingeniería en Sistemas".
- **Fichas base:** se llaman PAS-BASE, PRO-BASE e INV-BASE.

El diálogo muestra el código antes de crear la ficha. Si ya existe otra ficha con las mismas generalidades, lo avisa y sugiere crear una versión nueva de esa ficha en lugar de otra.

**Por qué el alcance queda fijo:** el código depende de la modalidad, la facultad y la carrera. Por eso esos datos no se pueden cambiar después; para otro alcance se crea otra ficha.

**Base de datos:** se agregó la columna `fichas.codigo`, con su script `scripts/fichas/agregar_codigo_fichas.ts`. Solo agrega.

### 2. Tabla y filtros

- **Columnas:** código, ficha (modalidad y alcance), estado, cohortes, procesos, fecha de actualización y botón para abrir.
- **Cohortes y procesos:** siguen previstos. Se llenan cuando cada cohorte quede ligada a una versión (entrega 3) y las propuestas usen la ficha (entrega 4). Mientras tanto, la tabla lo indica.
- **Filtros:** Todas, Borradores, Habilitadas y Deshabilitadas, cada uno con su conteo. También hay un filtro por modalidad y un buscador por código o carrera.
- **"Retirada" pasa a ser "Deshabilitada" en pantalla.** Deshabilitar no borra nada: los procesos que usaron esa versión conservan su historial. En la base el valor sigue siendo `retirada`, para no alterar lo ya guardado.
- **Modalidades:** Mixta (el caso de Medicina, con varias etapas seguidas) y Especialización (cursos autónomos) aparecen en el diálogo, deshabilitadas y marcadas como "Próximamente".

### 3. Flexibilidad de los elementos

Sí está contemplado, y se resuelve en dos niveles:

- **Reglas del elemento** (ya funciona): por ejemplo, si una empresa nueva requiere aprobación, o los días de anticipación de la carta.
- **Campos del elemento** (entrega posterior): en el ejemplo de "Datos empresariales" son 7 campos, del nombre al mapa. Por cada campo se podrá decidir si se pide y si es obligatorio, y también agregar campos nuevos.
  - Si se deja de pedir el organigrama, solo se desactiva en las fichas nuevas. Las propuestas anteriores conservan el suyo.
  - Hoy se ve en dos lugares: el panel de cada espacio (tarjeta "Campos que se piden") y la pestaña "Catálogo de elementos".

**Portadas:** la pestaña "Cierre" muestra las portadas de la propuesta, del informe de período y del informe final. Cada una tiene su propio logotipo y sus textos fijos, así que se podrán cambiar por separado. Corresponde a la plantilla de documentos (entrega 6).

### 4. Constructor y vista del egresado

Se recuperó el interruptor del prototipo, encima de las pestañas.

- **Vista del egresado:** muestra los pasos de la propuesta en orden, con la ayuda, las reglas en frases y los campos de cada paso, más el calendario de ejecución.
- **"Vista previa":** ya no existe como pestaña; la reemplaza este interruptor.

### 5. Cierre y Roles

Las dos pestañas vuelven, como diseño:

- **Cierre:** la estructura del informe final, sus requisitos y las portadas.
- **Roles:** quién realiza cada acción del proceso. Las marcas reflejan cómo funciona hoy, e incluye la opción de que el decanato trabaje sin coordinadores.

### 6. Catálogo

Es la pestaña "Catálogo de elementos" de la lista de fichas. Cada elemento muestra:

- su descripción;
- las modalidades donde funciona;
- los campos que llena el egresado;
- las reglas configurables con su valor actual.

El botón "+ Nuevo elemento" se ve, pero está deshabilitado: es de una entrega posterior.

### 7. Línea de tiempo y calendario

En la pestaña Ejecución:

- **Recorrido completo** arriba: Propuesta → Requisitos → Ejecución → Cierre → Presentaciones.
- **Línea de tiempo de cada etapa:**
  - los datos principales (días, informes, subperíodos, palabras, imágenes y páginas);
  - los períodos con sus subperíodos y la entrega de cada informe;
  - los hitos como bandas de color;
  - los requisitos previos a la izquierda.
- **Calendario de ejecución** al final, con fechas reales a partir de una fecha de inicio de ejemplo. También aparece en la vista del egresado.

Las dos vistas se recalculan con cada cambio.

### 8. Diseño de los bloques editables

El panel de cada espacio ahora:

- se organiza en tarjetas con título: "Contenido del paso", "Reglas" y "Campos que se piden";
- usa campos más bajos, con el título y la descripción lado a lado y la ayuda en 2 líneas;
- usa interruptores para las opciones de sí o no;
- muestra las opciones múltiples como botones.

La ejecución también se organiza en tarjetas compactas: Períodos, Registro, Revisión y cambios, e Informe.

### 9. Hitos

Cada hito ahora tiene un **tipo** y un **momento**:

- **Antes de iniciar la ejecución** (requisitos obligatorios): el dictamen de aprobación de la propuesta y el del plan de trabajo. La ficha base de pasantía ya los incluye, porque hoy el coordinador sube ambos dictámenes antes de dar inicio.
- **Durante la ejecución:** el primer contacto con el asesor (con su plazo), la visita del asesor (días 90 a 100, requisito del informe 3) y los hitos personalizados, con su ventana de días y el informe del que son requisito.

Los dos campos son opcionales en el formato. Las versiones guardadas antes se leen como "durante".

### 10. Elementos del informe final

En "Cierre" se ven los 12 apartados como los arma hoy el sistema. Cada uno indica si lo genera el sistema o lo redacta el egresado, y se puede activar, desactivar o reordenar. Para proyecto e investigación, "Descripción de la empresa" pasa a llamarse "Descripción de la institución".

### 11. Presentación de revisión y Presentación pública

Son dos pestañas de diseño, cada una con:

- un interruptor para indicar si la ficha la incluye;
- los requisitos para solicitarla y los documentos que se presentan (se pueden agregar o quitar);
- los participantes;
- la duración y la forma de evaluación.

**Valores:** son un ejemplo distinto por modalidad. Los reales se definirán con el asesor.

## Comprobado

Sobre `dev-fichas`, en el servidor de desarrollo:

- `tsc`, `eslint` y `verificar_fichas.ts` sin errores (29 de 29).
- **Lista y diálogo:**
  - la lista muestra los códigos y los filtros con sus conteos;
  - el diálogo genera PAS-GEN-001, PAS-ING-001-SIST y PRO-ING-002-SIST según las generalidades, y avisa del duplicado con PRO-ING-001-SIST.
- **Editor:**
  - se creó la ficha PAS-ING-001-SIST (pasantía de Ingeniería en Sistemas), que queda en borrador para la demostración;
  - todas las pestañas cargan sin errores de consola;
  - un hito personalizado se refleja en la línea de tiempo y el borrador se guarda con los campos nuevos de los hitos;
  - se creó y descartó una ficha de prueba (PAS-GEN-001).
- **Base de datos:** se ejecutaron `agregar_codigo_fichas.ts` y `sembrar_fichas_base.ts --actualizar-base`, para que la ficha base de pasantía incluya los dictámenes.

## Datos que quedaron en `dev-fichas`

| Código | Estado |
|---|---|
| PAS-BASE, PRO-BASE, INV-BASE | Fichas base |
| PRO-ING-001-SIST | Versión 1 habilitada |
| PAS-ING-001-SIST | Versión 1 en borrador, con un hito de ejemplo |
