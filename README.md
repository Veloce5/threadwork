# THREADWORK — Your personal wardrobe OS

**Phase 1: Project foundation + the first real wardrobe API.**

THREADWORK is a new, independent wardrobe-management project for SBUHacks. Built with **Java 21, Spring Boot, React, TypeScript, Vite**, and a persistent local H2 database (PostgreSQL-ready). The UI is a custom design with a dark green sidebar, editorial headings, brass accents, and responsive clothing cards.

## What works in this release

- A real Spring Boot REST API for **adding, listing, editing, and deleting** clothing.
- Validated fields: garment name, category, brand, color, price, purchase date, and notes.
- **Persistent local database**: your entries remain after restarting the app.
- Status changes for `AVAILABLE`, `WORN`, `LAUNDRY`, `DRYING`, and `REPAIR`.
- **Dashboard stats** for clothing count, availability, laundry, and purchase value.
- Search and filter the closet by category, availability, or text.
- Explicit **Load demo wardrobe** button that inserts eight *sample* items into an empty closet; nothing is automatically imported.
- JUnit backend integration tests and an optional CI workflow.

**Not built yet:** photo upload, outfit builder, wear event logging, cost-per-wear, calendar planning, packing optimization, AI classification, Snowflake audits, ElevenLabs narration, and cloud deployment. These belong to later roadmap phases. The clothing imagery in the demo is placeholder SVG illustration, not user-uploaded photos.

## Run on your Mac

### Requirements
- Java 21 and Maven (the existing `mvn` command from FORGE will work)
- Node.js 22 or newer and npm

Check versions:

```bash
java -version
mvn -version
node -v
npm -v
```

### Terminal window 1 — Java API

From the cloned repository root:

```bash
cd backend
mvn spring-boot:run
```

The backend runs at **http://localhost:8080**. To verify it, open http://localhost:8080/api/health in a browser.

### Terminal window 2 — React interface

Open **another Terminal tab/window**, then from the cloned repository root:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite development server proxies `/api` to Spring Boot on port 8080.

You should see the THREADWORK dashboard. Use **Add a piece**, or choose **Load demo wardrobe** to populate eight *clearly labeled demo items* when the wardrobe is empty. Try changing an item's status to Laundry, then verify the summary card updates. Restart both servers to verify persistence.

**Important:** This is a local single-user hackathon prototype. No accounts, authentication, or rate limiting exist yet. Do not deploy it as an internet-accessible service without adding these protections. Avoid uploading sensitive personal information. There are no paid API keys required for Phase 1.

## Backend REST endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Java backend health |
| GET | `/api/garments` | All clothing items |
| GET | `/api/garments/{id}` | One clothing item |
| POST | `/api/garments` | Create clothing item |
| PUT | `/api/garments/{id}` | Edit metadata |
| PATCH | `/api/garments/{id}/status` | Change status |
| DELETE | `/api/garments/{id}` | Remove clothing item |
| GET | `/api/summary` | Inventory and availability stats |
| POST | `/api/demo/seed` | Add eight sample items to an empty closet |

Example item creation:

```json
{
  "name": "Cream linen shirt",
  "category": "TOPS",
  "color": "#CFC5B4",
  "brand": "",
  "purchasePrice": 39.99,
  "purchasedOn": "2026-10-10",
  "notes": "Breathable cotton-linen blend"
}
```

## Database setup

The default database is **H2 file storage** in `backend/data/`. No installation or cloud account is needed. The `data/` directory is ignored by git.

When we connect Tiger Data later, set these environment variables before launching Spring Boot:

```bash
export DB_URL='jdbc:postgresql://your-db-host:5432/your-db?sslmode=require'
export DB_USER='...'
export DB_PASSWORD='...'
```

Use the full JDBC URL and store credentials only in your private environment, never in GitHub. Database migrations and production security will be added before deployment.

## Project organization

```text
threadwork/
  backend/
    pom.xml
    src/main/java/com/threadwork/
      api/        REST endpoints
      model/      Garment entity + validated input
      repo/       Spring Data repository
      service/    Core business logic
      config/     Local-development CORS
    src/main/resources/application.properties
    src/test/java/com/threadwork/
  frontend/
    src/App.tsx   React UI and interactions
    src/api.ts    Typed API client
    src/styles.css
  .github/workflows/ci.yml
  .gitignore
```

## Test checklist

- `mvn test` in `backend` passes.
- `npm run build` in `frontend` succeeds.
- The dashboard opens on `localhost:5173` and shows an empty closet first.
- Load the demo wardrobe; eight items appear.
- Add an item; it appears in closet and the dashboard count updates.
- Edit a garment's metadata.
- Set status to `LAUNDRY`; inventory availability recalculates.
- Restart the API and reload; items persist.

## Hackathon rules and attribution

THREADWORK's source code is newly authored for this phase, separate from previous projects. Coding was substantially assisted by ChatGPT. Credit this use clearly and make sure you can demonstrate and explain what the Java API and frontend are doing. The SBUHacks rules permit AI-assisted work while requiring honest disclosure. No prior code from FORGE or CogniFast has been reused.

## Next release

**Phase 2 — Virtual Closet:** user-uploaded clothing photos, saved image storage, garment detail views, more attributes (season, material, size), and improved catalog management. Only advance once the Phase 1 checklist is complete.
