# Módulo de fichas dinámicas — Entrega 0: preparación

Objetivo: dejar listo un entorno donde se pueda desarrollar el módulo sin poner en riesgo los datos ni el código de la fase 1.
Esta entrega no cambia el comportamiento del sistema.

## 1. Rama de trabajo

- Rama del módulo: `fase-2-fichas`, creada desde `fase-2-jonathan` el 29-oct-2026.
- Cada entrega se trabaja en esta rama con commits pequeños. Primero se reorganiza sin cambiar el comportamiento y después se cambia, en commits separados.
- Antes de unir con `fase-2-jonathan` o `main`, se pasa la lista de [REGRESION_PASANTIA.md](REGRESION_PASANTIA.md).

## 2. Archivos y comandos que requieren cuidado

### Archivos sensibles

| Archivo | Contiene | Regla |
|---|---|---|
| `.env.local` | `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` | Nunca se sube al repositorio (ya lo ignora `.env*` en `.gitignore`), nunca se pega en chats ni documentos y no se imprime en consola. |
| `.env.local.principal` (se crea en el paso 3) | Copia de las variables de la base principal | Igual que `.env.local`. También queda ignorado por `.env*`. |
| `usuarios.csv`, `Carreras.csv`, `Facultades.csv` | Datos de carga masiva | Revisar que no contengan datos personales reales antes de subirlos. |

- `DATABASE_URL` la usa la aplicación; `DATABASE_URL_UNPOOLED` la usan las migraciones (`drizzle.config.ts`). Las dos deben apuntar siempre a la misma base.
- Los archivos subidos (cartas, imágenes, documentos) se guardan dentro de la base en base64: una copia de la base incluye también los archivos.

### Scripts que borran datos

No se ejecutan contra la base principal:

| Script | Qué hace |
|---|---|
| `npm run db:reset` (`scripts/reset.ts`) | **Borra todas las tablas**, vuelve a crearlas y siembra datos de prueba |
| `scripts/drop.ts` | Borra tablas |
| `scripts/delete_propuestas.ts`, `scripts/delete_solicitudes.ts` | Borran propuestas o solicitudes |
| `scripts/clear_empresas.ts`, `scripts/cleanup_dummy_docs.ts` | Borran empresas o documentos |
| `scripts/sembrar_pasantias_prueba.ts` | Borra y vuelve a crear los usuarios de prueba (Andrea y Kevin) y todo lo que depende de ellos |
| `scripts/test-constraints.ts` | Inserta y borra filas de prueba |

Las migraciones (`npm run db:migrate`) también se prueban primero en la base de desarrollo.

## 3. Respaldo y base de desarrollo (Neon)

Se usan ramas de Neon: son copias instantáneas de la base, con todos sus datos y archivos. El equipo no tiene `pg_dump` instalado, así que esta es la forma más simple de respaldar.

Estos pasos los hace el responsable del proyecto en la consola de Neon, porque implican credenciales:

1. Entrar a la consola de Neon, abrir el proyecto y ir a **Branches**.
2. **Respaldo:** crear una rama desde la rama principal con los datos actuales, llamada `respaldo-2026-10-29`. No se conecta a nada; solo sirve para restaurar.
3. **Desarrollo:** crear otra rama desde la principal llamada `dev-fichas`.
4. En la rama `dev-fichas`, abrir **Connect** y copiar las dos cadenas de conexión: la *pooled* y la directa (*unpooled*).
5. En la carpeta del proyecto, copiar `.env.local` a `.env.local.principal`, para poder volver a la base principal.
6. En `.env.local`, reemplazar `DATABASE_URL` (cadena *pooled*) y `DATABASE_URL_UNPOOLED` (cadena directa) por las de `dev-fichas`, y agregar esta línea:

   ```
   DB_ENTORNO=desarrollo
   ```

7. Comprobar a qué base apunta el proyecto:

   ```bash
   npx tsx --env-file=.env.local scripts/verificar_base.ts
   ```

   Debe decir `Entorno declarado (DB_ENTORNO): desarrollo` y un endpoint distinto al de la base principal. Los conteos deben coincidir con los de la línea base (sección 4), porque la rama es una copia.

Para volver a la base principal, se restaura `.env.local` desde `.env.local.principal`.

## 4. Línea base

Conteos de la base principal el 29-oct-2026, antes de empezar el módulo (salida de `scripts/verificar_base.ts`):

- Endpoint de la base principal: empieza con `ep-little-ha…`
- 18 usuarios · 4 cohortes · 14 propuestas (3 en ejecución) · 15 informes

Si después de una entrega estos números cambian en la base principal sin que nadie haya usado el sistema, algo se ejecutó donde no debía.

## 5. Criterio para dar por terminada la entrega 0

- [x] Rama `fase-2-fichas` creada.
- [x] Script `scripts/verificar_base.ts` (solo lectura).
- [x] Lista de regresión escrita.
- [x] Ramas de Neon `respaldo-2026-10-29` y `dev-fichas` creadas.
- [x] `.env.local` apuntando a `dev-fichas` (endpoint `ep-shy-dream…`), con `DB_ENTORNO=desarrollo` y comprobado con el script.
- [x] Primera pasada de la lista de regresión sobre `dev-fichas`, para saber qué funciona hoy antes de cambiar nada: [pasadas/2026-10-29_linea_base.md](pasadas/2026-10-29_linea_base.md). Quedaron sin probar o probados solo en parte: A6–A8, B4 (lado del egresado), B8, C2, C4, D3 (decanato) y E3–E5.
