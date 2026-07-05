# Testing Guide — EgresadoApp

## Credenciales Seed

| Rol | Correo | Password |
|---|---|---|
| Admin | admin@uni.test | Test123! |
| Decanato | decanato@uni.test | Test123! |
| Asesor | asesor@uni.test | Test123! |
| Egresado | egresado@uni.test | Test123! |

## Comandos de Base de Datos

```bash
# Aplicar schema a la base de datos
npm run db:migrate

# Insertar datos de prueba
npm run db:seed

# Drop + migrate + seed (idempotente, seguro de correr múltiples veces)
npm run db:reset
```

## Datos Seed

El seed incluye:

- **1 Facultad:** Facultad de Ingeniería
- **2 Carreras:** Ingeniería en Sistemas, Ingeniería Industrial
- **4 Usuarios:** 1 por cada rol (admin, decanato, asesor, egresado)
- **3 Empresas:** 2 habilitadas (TechCorp Honduras, Industrias del Norte S.A.), 1 deshabilitada (Servicios Inactivos Ltda.)
- **3 Supervisores:** vinculados a las empresas habilitadas
- **1 Periodo activo:** Jul 2026 – Dic 2026

## Verificar Constraints

```bash
npx tsx scripts/test-constraints.ts
```

Verifica que los CHECK, UNIQUE, y FK constraints funcionan correctamente (12 tests).
