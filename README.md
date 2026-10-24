# THREADWORK — Your Wardrobe OS

Phase 8 adds an internal data-integrity audit and safe local H2 backup scripts using the existing Java 21/Spring Boot and React/TypeScript application.

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
- Season and occasion fields and advanced closet filters; sort by recency, name or price.
- Dashboard counts and wardrobe value; demo wardrobe loader.
- Phase 3: click or drag wardrobe items into five outfit slots; name, save, edit and delete looks. Saved outfits reference real garment IDs and immediately reflect their laundry/repair status.
- Phase 4: dedicated Laundry Center with guided stage transitions (Worn → Laundry → Drying → Ready), an append-only status change log, affected outfits and available replacement suggestions. You explicitly approve suggested swaps, preserving saved outfit data until then.
- Phase 5: log a saved outfit or individual garment by date; store durable wear events; view recent activity, garment-level counts and cost per recorded wear. Today’s logged wears move available items to WORN, while past logs do not affect current garment availability.\n- Phase 6: automatic, explainable recommendations that first enforce garment availability and category requirements, then rank combinations using occasion/season labels and recorded wears. Save any recommended look to Outfit Studio. If the wardrobe has no complete available outfit, the app explicitly explains what's missing.
- Phase 7: assign real saved looks to Morning/Afternoon/Evening on any date, with alerts for current unavailability and same-day shared garments. Reassigning the same date and slot replaces the earlier assignment. Plan a multi-day trip by activity tags and generate a compact reusable packing list.
- Phase 8: read-only Workspace Health audit for missing garment files, mismatched wear counts, deleted outfit pieces and orphan calendar references; a safe local H2+photos backup script and archive checker.
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
