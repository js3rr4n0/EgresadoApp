# EgresadoApp

<p align="center"><a href="README.md">English</a> · <b>Español</b></p>

**Sistema de gestión de trabajos de graduación para universidades.** Reemplaza el proceso en papel y por correo que siguen los estudiantes para proponer, aprobar y completar su Trabajo de Graduación, con una sola aplicación web donde cada rol ve exactamente lo que necesita.

Desarrollado para la Universidad Católica de El Salvador (UNICAES).

🔗 **Demo en vivo:** [egresado-app.vercel.app](https://egresado-app.vercel.app/)

![Panel de administración](docs/screenshots/admin-dashboard.png)

---

## Qué hace

El trabajo de graduación de un estudiante pasa por varias personas. EgresadoApp le da a cada una su propio panel y mueve la propuesta entre ellas con un estado claro en cada paso.

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Gestionar usuarios, facultades y carreras, ciclos académicos y el catálogo de empresas. Hacer cargas masivas desde CSV. Ver estadísticas de todos los proyectos. |
| **Egresado** | Subir los documentos obligatorios (servicio social, notas, pago). Redactar hasta 3 propuestas en un formulario guiado de varios pasos, invitar compañeros y seguir las observaciones. |
| **Coordinador** | Revisar las propuestas entrantes, asignar asesores de su facultad, emitir dictámenes, dar inicio al plan de trabajo y atender solicitudes de baja. |
| **Asesor** | Aceptar o rechazar asignaciones, dar seguimiento a sus estudiantes y redactar informes. |
| **Decanato** | Panel base listo; las herramientas de aprobación están en desarrollo. |

**Funciones principales**
- Control de acceso por rol: cada rol solo llega a sus propias rutas, validado en el servidor con sesiones JWT firmadas.
- Validación de documentos: el estudiante no puede enviar una propuesta hasta subir los PDF obligatorios.
- Formulario de propuesta en varios pasos: portada, descripción del problema, justificación, objetivos, alcance, actividades y participantes.
- Historial de la propuesta con estados (borrador, enviada, en revisión, aprobada, rechazada) y notificaciones.
- Vistas imprimibles y listas para PDF de propuestas y fichas de empresas.
- Catálogo de empresas con sucursales, supervisores y un mapa interactivo para elegir ubicaciones.
- Carga masiva por CSV con validación previa antes de guardar.
- Gráficas en el panel que resumen los proyectos por estado.

## Capturas

| | |
|---|---|
| ![Inicio de sesión](docs/screenshots/login.png) **Inicio de sesión** | ![Usuarios](docs/screenshots/admin-users.png) **Gestión de usuarios** con filtros por rol, facultad y cohorte |
| ![Empresas](docs/screenshots/admin-companies.png) **Catálogo de empresas** donde los estudiantes pueden hacer su trabajo | ![Ciclos](docs/screenshots/admin-periods.png) **Ciclos académicos** con fechas límite |
| ![Carga CSV](docs/screenshots/admin-csv-import.png) **Carga masiva por CSV** de facultades, carreras y usuarios | ![Egresado](docs/screenshots/student-dashboard.png) **Vista del egresado**: documentos obligatorios y propuestas |
| ![Propuestas](docs/screenshots/admin-proposals.png) **Gestión de propuestas** con filtros por estado y asignación de coordinador | ![Asesor](docs/screenshots/advisor-dashboard.png) **Vista del asesor** |

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 16** (App Router, Server Actions), **React 19**, **TypeScript** |
| Base de datos | **PostgreSQL** en **Neon** (serverless), **Drizzle ORM** |
| Autenticación | Sesiones JWT con **jose**, contraseñas cifradas con **bcrypt**, protección de rutas por rol |
| Interfaz | **Tailwind CSS**, **Recharts** (gráficas), **React Leaflet** (mapas) |
| Documentos | **jsPDF**, **dom-to-image** (exportación a PDF), **PapaParse** (lectura de CSV) |
| Hosting | **Vercel** |

## Estructura del proyecto

```
src/
├── app/
│   ├── admin/         # Panel de administración: usuarios, empresas, ciclos, propuestas, carga CSV
│   ├── egresado/      # Panel del egresado y formularios de propuesta
│   ├── coordinador/   # Revisión y dictámenes del coordinador
│   ├── asesor/        # Seguimiento e informes del asesor
│   ├── decanato/      # Vista del decanato
│   ├── actions/       # Server Actions (lógica de negocio y escritura en la base de datos)
│   └── login/
├── components/        # Formularios, tablas, gráficas y selector de mapa reutilizables
├── lib/               # Cliente de base de datos, esquema Drizzle, manejo de sesión
└── proxy.ts           # Protección de rutas por rol
drizzle/               # Migraciones SQL
scripts/               # Scripts de datos de prueba, migración y mantenimiento
```

## Cómo correrlo localmente

**Requisitos:** Node.js 20+ y una base de datos PostgreSQL (un proyecto gratuito de [Neon](https://neon.tech) funciona).

```bash
git clone https://github.com/js3rr4n0/EgresadoApp.git
cd EgresadoApp
npm install
```

Crea un archivo `.env.local`:

```env
DATABASE_URL="postgresql://usuario:contraseña@host/db?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://usuario:contraseña@host/db?sslmode=require"
AUTH_SECRET="una-cadena-larga-y-aleatoria"
```

Crea las tablas, carga los datos de prueba e inicia la app:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Los datos de prueba crean un usuario por rol (`admin@uni.test`, `asesor@uni.test`, `egresado@uni.test`, `decanato@uni.test`), todos con la contraseña `Test123!`.

## Documentación

- [Manual de usuario (PDF)](MANUAL_DE_USUARIO_EGRESADOAPP.pdf)
- [Documentación del sistema (PDF)](DOCUMENTACION_SISTEMA_EGRESADOAPP.pdf)
- [Plan de desarrollo](specs/PLAN.md)

---

Desarrollado por **Julio César Serrano Sandoval** · [LinkedIn](https://www.linkedin.com/in/julioserrasand/)
