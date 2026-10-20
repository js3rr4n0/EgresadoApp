# EgresadoApp

<p align="center"><b>English</b> · <a href="README.es.md">Español</a></p>

**Graduation-project management system for universities.** It replaces the paper-and-email process students go through to propose, get approved, and complete their graduation project (*Trabajo de Graduación*), with one web app where every role sees exactly what it needs.

Built for Universidad Católica de El Salvador (UNICAES). The interface is in Spanish.

🔗 **Live demo:** [egresado-app.vercel.app](https://egresado-app.vercel.app/)

![Admin dashboard](docs/screenshots/admin-dashboard.png)

---

## What it does

A student's graduation project passes through several people. EgresadoApp gives each of them a dedicated dashboard and moves the proposal between them with a clear status at every step.

| Role | What they can do |
|---|---|
| **Admin** | Manage users, faculties and majors, academic periods, and the catalog of partner companies. Bulk-import data from CSV. See statistics for every project. |
| **Student (Egresado)** | Upload the required documents (social service, grades, payment). Write up to 3 project proposals in a guided multi-step form, invite teammates, and track feedback. |
| **Coordinator** | Review incoming proposals, assign advisors from their faculty, issue rulings, start the work plan, and handle withdrawal requests. |
| **Advisor (Asesor)** | Accept or decline assignments, follow up on assigned students, and write reports. |
| **Dean's office (Decanato)** | Dashboard shell in place; approval tools are on the roadmap. |

**Main features**
- Role-based access control: each role only reaches its own routes, enforced on the server with signed JWT sessions.
- Document gate: a student can't submit a proposal until the mandatory PDFs are uploaded.
- Multi-step proposal form: cover page, problem description, justification, objectives, scope, activities, and participants.
- Proposal history with statuses (draft, submitted, under review, approved, rejected) and notifications.
- Printable, PDF-ready views of proposals and company records.
- Company catalog with branches, supervisors, and an interactive map for choosing locations.
- CSV bulk import with dry-run validation before anything is saved.
- Dashboard charts summarizing projects by status.

## Screenshots

| | |
|---|---|
| ![Login](docs/screenshots/login.png) **Login** | ![Users](docs/screenshots/admin-users.png) **User management** with filters by role, faculty and cohort |
| ![Companies](docs/screenshots/admin-companies.png) **Company catalog** where students can do their project | ![Periods](docs/screenshots/admin-periods.png) **Academic periods** with submission deadlines |
| ![CSV import](docs/screenshots/admin-csv-import.png) **CSV bulk import** for faculties, majors and users | ![Student](docs/screenshots/student-dashboard.png) **Student view**: required documents and proposals |
| ![Proposals](docs/screenshots/admin-proposals.png) **Proposal management** with status filters and coordinator assignment | ![Advisor](docs/screenshots/advisor-dashboard.png) **Advisor view** |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Server Actions), **React 19**, **TypeScript** |
| Database | **PostgreSQL** on **Neon** (serverless), **Drizzle ORM** |
| Auth | JWT sessions with **jose**, passwords hashed with **bcrypt**, role-based route guard |
| UI | **Tailwind CSS**, **Recharts** (charts), **React Leaflet** (maps) |
| Documents | **jsPDF**, **dom-to-image** (PDF export), **PapaParse** (CSV parsing) |
| Hosting | **Vercel** |

## Project structure

```
src/
├── app/
│   ├── admin/         # Admin dashboard: users, companies, periods, proposals, CSV import
│   ├── egresado/      # Student dashboard and proposal forms
│   ├── coordinador/   # Coordinator review and rulings
│   ├── asesor/        # Advisor follow-up and reports
│   ├── decanato/      # Dean's office overview
│   ├── actions/       # Server Actions (business logic and database writes)
│   └── login/
├── components/        # Reusable forms, tables, charts, map selector
├── lib/               # Database client, Drizzle schema, session handling
└── proxy.ts           # Role-based route protection
drizzle/               # SQL migrations
scripts/               # Seed, migration and maintenance scripts
```

## Running it locally

**Requirements:** Node.js 20+ and a PostgreSQL database (a free [Neon](https://neon.tech) project works).

```bash
git clone https://github.com/js3rr4n0/EgresadoApp.git
cd EgresadoApp
npm install
```

Create a `.env.local` file:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@host/db?sslmode=require"
AUTH_SECRET="a-long-random-string"
```

Create the tables, load sample data and start the app:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The seed creates one user per role (`admin@uni.test`, `asesor@uni.test`, `egresado@uni.test`, `decanato@uni.test`), all with the password `Test123!`.

## Documentation

- [User manual (PDF)](MANUAL_DE_USUARIO_EGRESADOAPP.pdf)
- [System documentation (PDF)](DOCUMENTACION_SISTEMA_EGRESADOAPP.pdf)
- [Development plan](specs/PLAN.md)

---

Built by **Julio César Serrano Sandoval** · [LinkedIn](https://www.linkedin.com/in/julioserrasand/)
