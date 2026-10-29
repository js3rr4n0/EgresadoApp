# Módulo de fichas dinámicas — Entrega 1: modelo de datos y catálogo

**Objetivo:** que exista la forma de guardar una ficha y que las tres modalidades actuales estén descritas como fichas, sin cambiar el comportamiento del sistema.

Nada del código de la fase 1 lee todavía las fichas. Eso empieza en la entrega 4, que conecta la propuesta de pasantía.

## 1. Qué se agregó

| Archivo | Qué es |
|---|---|
| `src/lib/fichas/tipos.ts` | Formato de la definición de una ficha (el JSON que se guarda). |
| `src/lib/fichas/catalogo.ts` | Catálogo de los 9 elementos, con sus parámetros y valores por defecto. |
| `src/lib/fichas/validar.ts` | `validarDefinicion()`: lista de problemas en lenguaje del administrador. |
| `src/lib/fichas/fichasBase.ts` | `definicionBase(modalidad)`: pasantía, proyecto e investigación tal como funcionan hoy. |
| `src/lib/schema.ts` | Tablas `fichas` y `fichas_versiones`, agregadas al final del esquema. |
| `scripts/fichas/crear_tablas_fichas.ts` | Crea las dos tablas. Solo agrega y se puede ejecutar varias veces. |
| `scripts/fichas/sembrar_fichas_base.ts` | Crea las 3 fichas base con su versión 1 habilitada; si ya existen, no las toca. |
| `scripts/fichas/verificar_fichas.ts` | 24 comprobaciones sin base de datos: hacen las veces de pruebas. |
| `scripts/fichas/guardia.ts` | Detiene los scripts que escriben si la base no tiene `DB_ENTORNO=desarrollo`. |

Los módulos de `src/lib/fichas` son puros: no usan la base de datos ni APIs de Next.js, así que pueden usarse en el servidor y en el navegador.

## 2. El modelo

### Tablas

- **`fichas`:** la identidad de la ficha.
  - Nombre y modalidad (`pasantia`, `proyecto` o `investigacion`).
  - Alcance opcional por facultad y por carrera; `null` significa "todas".
  - `es_base`: marca las fichas que describen la fase 1.
- **`fichas_versiones`:** el contenido. Cada versión tiene:
  - número;
  - estado (`borrador`, `habilitada` o `retirada`);
  - la definición en JSON;
  - la versión de la que se copió (`basada_en_id`);
  - las fechas de creación, habilitación y retiro.

**Reglas que asegura la base de datos:**
- El número de versión no se repite dentro de una ficha.
- Hay como máximo un borrador por ficha.
- El estado y la modalidad solo aceptan los valores definidos.

**Reglas que asegurará el código del constructor (entrega 2):**
- Una versión habilitada no se edita: se crea un borrador nuevo a partir de ella.
- Al habilitar un borrador se valida con `validarDefinicion()`.

### Definición (JSON)

```
DefinicionFicha
├─ formato: 1                       ← versión del formato, para poder cambiarlo después
├─ modalidad
├─ participantes: { min, max }
└─ etapas
   ├─ propuesta (siempre la primera)
   │   └─ espacios[]: { id, elemento, titulo, descripcion, ayuda, obligatorio, parametros, origenFase1? }
   └─ ejecucion (cero o más, en orden)
       ├─ inicio: carta | etapa_anterior
       ├─ unidad, periodos, duracionPeriodo, subperiodos
       ├─ registro: palabras de descripción y conclusión, imágenes
       ├─ diasRevision, subperiodosAdelantables, eliminacionesPorPeriodo
       ├─ informe: páginas mínimas, actividades aprobadas, comentarios al decanato
       ├─ diasPrimerContacto
       └─ hitos[]: { nombre, desde, hasta, requisitoDeInforme }
```

**Decisiones:**
- **`origenFase1`:** los espacios de las fichas base indican en qué columna guarda hoy la fase 1 su respuesta, por ejemplo `propuestas.justificacion_proceso`. Así, la entrega 4 puede leer y escribir donde ya están los datos sin migrarlos.
  - Los espacios nuevos que el administrador agregue no lo tienen. Guardarán su respuesta en una tabla propia, que se creará en la entrega 4. Es la decisión que estaba pendiente sobre el "Bloque de texto".
- **Subperíodos:** se reparten en partes iguales y el último se queda con el residuo. Con 30 días y 4 subperíodos da 7, 7, 7 y 9, la misma regla que hoy está en `periodosPasantia.ts`.
- **El primer contacto no es un hito:** hoy se cuenta desde que el asesor crea el informe, no desde el inicio de la ejecución, así que es un plazo (`diasPrimerContacto`). La visita sí es un hito: días 90 a 100, requisito del informe 3.
- **Lo que queda fuera del formato 1:** el cierre, los roles y la plantilla de documento se agregarán en entregas posteriores, sin romper las definiciones guardadas.

### Catálogo

Son 9 elementos, uno por cada paso que ya existe en el asistente:

- portada
- datos empresariales
- datos del supervisor
- carta de aceptación
- cronograma
- bloque de texto (el único repetible)
- actores intervinientes
- objetivos
- documentación de soporte

**Cada elemento declara:**
- en qué modalidades sabe funcionar hoy (por ejemplo, el cronograma solo en pasantía);
- de qué elementos depende (el supervisor va después de la empresa; el cronograma, después de la carta);
- sus parámetros, cada uno con rango y valor por defecto.

**Los valores por defecto reproducen la fase 1:**
- Desde constantes exportadas: los 30 días por período y las 4 semanas, los límites de 200–300 y 40–60 palabras, las 2 imágenes, las 20 páginas, la visita del día 90 al 100 y las 40 palabras por comentario.
- Copiados de `VALORES_FASE1_COPIADOS`, porque hoy están escritos dentro de archivos `"use server"` o de componentes y no pueden importarse: los 21 días de anticipación, los 7 días del primer contacto, los 3 días de revisión, 1 eliminación por período, la visita como requisito del informe 3 y los 3 integrantes.
- `verificar_fichas.ts` revisa en el código fuente que esos valores copiados sigan iguales. Si alguien los cambia, avisa.

## 3. Cómo aplicarla

Primero en la base de desarrollo. Los scripts de escritura se niegan a correr si `DB_ENTORNO` no es `desarrollo`.

```bash
npx tsx scripts/fichas/verificar_fichas.ts
npx tsx --env-file=.env.local scripts/verificar_base.ts
npx tsx --env-file=.env.local scripts/fichas/crear_tablas_fichas.ts
npx tsx --env-file=.env.local scripts/fichas/sembrar_fichas_base.ts
```

**Base principal:** no se aplica en esta entrega. Cuando el módulo esté listo para usarse se correrán los mismos dos scripts con `--confirmo-base-principal`, después de pasar la lista de regresión.

**No usar `npm run db:migrate` para esto:** ejecuta `drizzle-kit push --force`, que sincroniza la base con todo el esquema y puede proponer cambios en tablas que no son de este módulo.

## 4. Resultado en `dev-fichas` (29-oct-2026)

- `verificar_fichas.ts`: 24 de 24 comprobaciones correctas.
- Tablas creadas.
- Fichas 1, 2 y 3: "Pasantía (fase 1)" con 2 etapas y 7 espacios, "Proyecto (fase 1)" con 8 espacios e "Investigación (fase 1)" con 7. Cada una tiene su versión 1 habilitada.
- Al repetir los dos scripts no se duplicó nada.
- La base rechaza un estado inválido en `fichas_versiones`.
- `tsc --noEmit` no da errores en el código del proyecto. Solo reporta uno en `.next/dev/types/validator.ts`, un archivo que genera el servidor de desarrollo.
- La guardia detiene el script cuando no hay `DB_ENTORNO=desarrollo`. Se probó con una conexión falsa, sin tocar la base principal.
- La aplicación sigue cargando: el panel de admin abre sin errores.
- No se tocó ningún archivo de la fase 1, salvo agregar las tablas al final de `schema.ts`. Por eso no hace falta otra pasada de regresión.

## 5. Lo que no hace esta entrega y queda para después

- **Entrega 2:** pantalla del constructor en `/admin/bloques-propuestas`.
- **Entrega 3:** columna `propuestas.ficha_version_id` y relación de las versiones con las cohortes.
- **Entrega 4:** tabla de respuestas para los espacios nuevos.
- **Entrega 4 en adelante:** el interruptor (variable de entorno) para que el sistema lea las reglas desde la ficha.
- **Corrección pendiente de la pasada 1 (O2):** el desfase de un día de `ActividadesForm.tsx:84`. Conviene corregirla en un commit propio antes de la entrega 4, porque ese cálculo pasará a depender de la ficha.

## 6. Preguntas del asesor que afectan el modelo

El modelo ya deja espacio para ellas, pero falta la decisión:

- **Alcance por facultad o carrera:** existen `facultad_id` y `carrera_id`. Falta confirmar si también hace falta por cohorte o por área.
- **Participantes:** hoy son un rango dentro de la ficha (`participantes.min/max`). Si el asesor prefiere 3 fichas separadas (1, 2 y 3 integrantes), basta con crear 3 fichas; el formato no cambia.
- **Medicina:** el formato admite varias etapas de ejecución seguidas y la unidad en meses. Falta definir qué significa "mensual" (¿meses de calendario o bloques de 30 días?). Hasta entonces, la validación solo comprueba la coherencia con la carta cuando la unidad es días.
- **Roles y elementos nuevos creados por el administrador:** quedan fuera del formato 1.
