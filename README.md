# THREADWORK Studio — Your Wardrobe OS

The final Studio release combines the original reliable wardrobe workflows with a new, daily-use **Today** home, five-section top navigation and a coherent forest, ivory and warm-brass interface. The backend remains Java 21 + Spring Boot; the frontend remains React + TypeScript; your H2 database remains compatible. No paid APIs or authentication dependencies are needed for local use.

## Run locally
Backend terminal:
```bash
cd ~/Desktop/Codes/Hackathons/SBUHacks/threadwork/threadwork/backend
mvn spring-boot:run
```
Frontend terminal:
```bash
cd ~/Desktop/Codes/Hackathons/SBUHacks/threadwork/threadwork/frontend
npm install
npm run dev
```
Open http://127.0.0.1:5173. No API key required.

## Available functionality
- Persistent wardrobe with add/edit/delete, category, brand, purchase price, colors, notes and status.
- Photos: JPEG/PNG upload up to 4 MB, real pictures in item cards, detailed item view, replace/remove photos.
- Season and occasion fields and advanced closet filters; sort by recency, name, price, or rainbow color.
- Dashboard counts and wardrobe value; demo wardrobe loader.
- Phase 3: click or drag wardrobe items into five outfit slots; name, save, edit and delete looks. Saved outfits reference real garment IDs and immediately reflect their laundry/repair status.
- Phase 4: dedicated Laundry Center with guided stage transitions (Worn → Laundry → Drying → Ready), an append-only status change log, affected outfits and available replacement suggestions. You explicitly approve suggested swaps, preserving saved outfit data until then.
- Phase 5: log a saved outfit or individual garment by date; store durable wear events; view recent activity, garment-level counts and cost per recorded wear. Today’s logged wears move available items to WORN, while past logs do not affect current garment availability.\n- Phase 6: automatic, explainable recommendations that first enforce garment availability and category requirements, then rank combinations using occasion/season labels and recorded wears. Save any recommended look to Outfit Studio. If the wardrobe has no complete available outfit, the app explicitly explains what's missing.
- Phase 7: assign real saved looks to Morning/Afternoon/Evening on any date, with alerts for current unavailability and same-day shared garments. Reassigning the same date and slot replaces the earlier assignment. Plan a multi-day trip by activity tags and generate a compact reusable packing list.
- Phase 8: read-only Workspace Health audit for missing garment files, mismatched wear counts, deleted outfit pieces and orphan calendar references; a safe local H2+photos backup script and archive checker.
- Studio release: a daily dashboard combining current outfit plans, season-aware (not weather-aware) recommendations, care queue, unworn-item suggestions and wardrobe pulse. Accessible five-section top navigation (Today, Closet, Looks, Care, Insights), responsive layout, warm forest/ivory/brass design. Logging wears and bulk care actions require confirmation. Bulk care actions report partial failures instead of claiming success.
- Still planned: authentication, deployment and optional sponsor integrations.

## Photos and database
- H2 defaults to `backend/data/threadwork.mv.db`; private image files are saved to `backend/data/photos`.
- Existing garments are preserved by schema defaults for new fields.
- Photos stay local, not in GitHub. Validated image signatures and decoded dimensions (max 5000px each, 20 MP). Unsupported files are rejected.
- The app is a local development prototype and needs authentication and rate limiting before public hosting.
- A new garment is created before its photo uploads; in the event the photo fails, edit the new item to retry.
- Optional environment: `THREADWORK_UPLOAD_DIR`, `DB_URL`, `DB_USER`, `DB_PASSWORD`.

## API
```text
GET    /api/health
GET    /api/garments
POST   /api/garments
PUT    /api/garments/{id}
PATCH  /api/garments/{id}/status
DELETE /api/garments/{id}
POST   /api/garments/{id}/photo  (multipart file)
GET    /api/garments/{id}/photo
DELETE /api/garments/{id}/photo
GET    /api/outfits
POST   /api/outfits
GET    /api/outfits/{id}
PUT    /api/outfits/{id}
DELETE /api/outfits/{id}
POST   /api/laundry/{id}/transition
GET    /api/laundry/history
GET    /api/laundry/outfits/{id}/alternatives
GET    /api/wears
POST   /api/wears
GET    /api/wears/analytics
GET    /api/recommendations?occasion=EVERYDAY&season=ALL_SEASONS&requireLayer=false&limit=8
GET    /api/planner/calendar?start=2026-10-24&end=2026-11-07
PUT    /api/planner/calendar
DELETE /api/planner/calendar/{id}
POST   /api/planner/packing
GET    /api/system/audit
GET    /api/summary
POST   /api/demo/seed
```

## Quality
GitHub CI validates backend Maven tests and the React production build. Photo API tests cover upload, retrieval and bad-file rejection. Submit your hackathon work with proper disclosure of substantial AI assistance.

## Development plan
See [ROADMAP.md](ROADMAP.md). Phase 9 will focus on authentication and deployment hardening. Optional Tiger Data, Snowflake, Gemini and ElevenLabs integrations remain unconnected until separately configured and verified.

## Laundry workflow behavior

The dedicated Laundry Center permits guided steps, including Worn → Laundry → Drying → Available. Garments can also enter the Repair state. The existing status dropdown remains a manual override for correcting a garment's recorded status; **both types of status changes produce history events**. Events are recorded from Phase 4 onward; historic status changes from earlier releases cannot be reconstructed.

Replacements are deterministic: the same garment category and an AVAILABLE status are required, and matching occasion/season improve their order. Suggestions do not claim fashion expertise and never alter a saved outfit until selected. No automatic washing or timers occur.

## Phase 5: actual wear data

A recorded wear is a durable event with a selected date, a snapshot of the participating garment IDs, and an optional saved-outfit reference. Cost-per-wear is calculated as purchase price divided by logged wear occurrences. Unlogged garments show a null cost-per-wear, not zero. Logging the same garment multiple times creates multiple wear records; use this when actual wears occurred.\n\nThe dashboard tracks **recorded** activity only. Today's wear requires available pieces and changes their status to WORN, with a corresponding laundry history entry; wear records added for past dates leave the current availability alone. This local demo uses no automatic garment tracking. Wear events currently have no delete/edit operation (append-only), so use the demo carefully.\n
## Phase 6: explanation-first outfit generation

The Java generator assembles ready-to-wear TOPS+BOTTOMS+FOOTWEAR or DRESSES+FOOTWEAR (optionally plus OUTERWEAR). It never pulls items marked WORN, LAUNDRY, DRYING or REPAIR. Occasion, season and recorded wear counts influence a deterministic ranking; these are **user-provided metadata heuristics**, not objective style ratings. The generator does not check live weather or product specifications. If no full outfit is available, the API provides actionable blockers rather than inventing results. Limit: 1–20 suggestions per request, with conservative computation bounds for large wardrobes.

Generated looks are temporary until the user explicitly saves one, at which point the existing Outfit Studio persists real garment references.

## Phase 7 — Calendar and packing rules

Calendar assignments are persisted in the same H2 database as your garments. Every calendar slot represents one saved outfit on a specified day (Morning, Afternoon, Evening). Changing a saved outfit automatically updates its planned appearance. Deleting a referenced outfit leaves a clearly flagged calendar entry until the user replaces or removes it. Outfits that currently have unavailable clothing are warned about, but the application **does not predict availability on future dates**. Same-day reuse of pieces is a warning, not prohibited.

The packing endpoint accepts 1–14 days, each with an activity/occasion. It uses the existing availability-aware recommendation engine and a bounded beam-search heuristic to reduce the number of distinct pieces. It assumes garments can be reused across days, and does not simulate laundry, weather, or storage constraints. The generated packing list and checkboxes are previews; nothing is marked as packed or worn in the database.

## Phase 8 — Data integrity and backup

Open **Workspace health** in the sidebar to run the read-only Java consistency audit. A clean audit does not replace a backup. For a local archive containing the real H2 database and photos, stop Spring Boot and run `bash scripts/backup-local.sh` from the repository root. See [docs/DATA_SAFETY.md](docs/DATA_SAFETY.md) for verification, recovery, privacy and optional PostgreSQL guidance. Do not publish backups or expose THREADWORK to the internet without authentication.

## THREADWORK Studio — final UI notes

This build keeps every existing feature and database format. **Today** shows planned outfits from the calendar or wardrobe-based suggestions; a calendar outfit can be unavailable, in which case its wear button is disabled and you can explore alternatives. Pressing **Wear this today** requires explicit confirmation because wear events are intentionally permanent.

The Today care queue can move all garments in the displayed status to the next laundry stage. The UI requests confirmation and processes garments one at a time. If a step fails, it reports how many completed and refreshes the database-backed state. This is not one atomic transaction; for fine-grained controls open Laundry Center.

The current season filter is calculated from the browser month, **not live weather**. The 'never logged' panel uses recorded wear events and cannot know what you wore outside the app. Full wear logging, alternatives, packing and analytics remain separate dedicated tools.

### To preview without touching the main project

Unzip the source into a **different directory**, do not copy your existing `backend/data/`. With Java 21 and Maven installed:

- In the extracted `backend` folder: `PORT=8082 mvn spring-boot:run`
- In the extracted `frontend` folder: `npm install`, then `THREADWORK_API_TARGET=http://127.0.0.1:8082 npm run dev -- --port 5175`
- Open `http://127.0.0.1:5175`. This copy creates its own local database, not yours.

To use your real wardrobe, back up and stop the original server first, then work with a private *copy* of `backend/data` only if desired; never share the database, photos or backup publicly.

### Build verification

From the project root: `mvn -f backend/pom.xml test` and `npm install --prefix frontend && npm run build --prefix frontend`. The working branch can also be tested through GitHub Actions. Never treat a syntax-only check as a successful production build.

## Running the correct backend (Studio compatibility check)

If Today reports `No static resource api/laundry/{id}/transition`, the browser is usually connected to a stale Java process, because the current backend implements this endpoint. It is possible for an older backend to return garment counts from a different local H2 database while lacking saved outfits, wear logs, or laundry routes.

Stop any old Java/Vite servers with Control+C and inspect `lsof -nP -iTCP:8080 -sTCP:LISTEN`. From the **original project**, restart using `cd backend && mvn spring-boot:run`. The frontend expects this server on 8080. Check `curl -s http://localhost:8080/api/health` (it should include `"phase":"8"`) and `curl -s http://localhost:8080/api/laundry/history` (it should return an array). If totals still do not match the previous wardrobe, inspect the configured `DB_URL` and backend working directory before making any changes or attempting restoration; by default the H2 file is relative to the backend process's working directory. **Do not overwrite or delete any database.** The frontend now checks the backend identity and Laundry API before enabling its data-editing screens.

## 40-piece demo wardrobe with Commons photography

From the **original project's root**, run `python3 scripts/seed-wardrobe-catalog.py` while the correct Java backend is already listening on port 8080. The script confirms the existing garment, outfit, and wear counts before proceeding; type `IMPORT` to approve. It adds 40 new, individually named **demo** items without modifying untagged existing wardrobe pieces. Photo downloads come from Wikimedia Commons, and the importer uses the existing backend API to store each image in `backend/data/photos`.

The catalog includes 11 tops, 8 bottoms, 5 outerwear, 4 dresses, 7 footwear, and 5 accessories, with different colors, prices, seasons, occasions and care statuses. Demo entries are marked `[TW-DEMO40:<code>]` in the notes. Photos are reference images that may not exactly match the mock item color/brand. Photos are used under their respective free licenses; credits, authors and file source URLs are retained in each item's notes and `backend/data/demo-photo-credits.csv` (included with normal local backups of `backend/data`). Do not represent these images as a personally owned wardrobe or claim they depict a specific brand.

The importer is repeat-safe: running it again fills missing images or unfinished entries without duplicating completed pieces. It has a preflight Commons photo check and reports all partial failures. If Commons is unavailable or image metadata does not meet the license criteria, retry later; the script **does not promise all 40 photos unless the final run reports success**. It requires internet access to Commons during import but afterwards photos are stored locally. Before importing into your real database, run `python3 scripts/seed-wardrobe-catalog.py --dry-run` to review the catalog and verify the server. The importer supports only localhost port 8080 to prevent accidental uploads elsewhere.

Tests for the catalog (mocked image and backend network calls): `python3 -m unittest discover -s scripts/tests -v`.
