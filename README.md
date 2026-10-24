# THREADWORK — Your Wardrobe OS

Phase 6 adds a deterministic Smart Outfit Generator using the existing Java 21/Spring Boot and React/TypeScript application.

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
- Planned later: outfit calendar, external weather integration, travel packing.

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
GET    /api/summary
POST   /api/demo/seed
```

## Quality
GitHub CI validates backend Maven tests and the React production build. Photo API tests cover upload, retrieval and bad-file rejection. Submit your hackathon work with proper disclosure of substantial AI assistance.

## Development plan
See [ROADMAP.md](ROADMAP.md). Phase 7 will build the calendar planner and travel packing optimizer.

## Laundry workflow behavior

The dedicated Laundry Center permits guided steps, including Worn → Laundry → Drying → Available. Garments can also enter the Repair state. The existing status dropdown remains a manual override for correcting a garment's recorded status; **both types of status changes produce history events**. Events are recorded from Phase 4 onward; historic status changes from earlier releases cannot be reconstructed.

Replacements are deterministic: the same garment category and an AVAILABLE status are required, and matching occasion/season improve their order. Suggestions do not claim fashion expertise and never alter a saved outfit until selected. No automatic washing or timers occur.

## Phase 5: actual wear data

A recorded wear is a durable event with a selected date, a snapshot of the participating garment IDs, and an optional saved-outfit reference. Cost-per-wear is calculated as purchase price divided by logged wear occurrences. Unlogged garments show a null cost-per-wear, not zero. Logging the same garment multiple times creates multiple wear records; use this when actual wears occurred.\n\nThe dashboard tracks **recorded** activity only. Today's wear requires available pieces and changes their status to WORN, with a corresponding laundry history entry; wear records added for past dates leave the current availability alone. This local demo uses no automatic garment tracking. Wear events currently have no delete/edit operation (append-only), so use the demo carefully.\n
## Phase 6: explanation-first outfit generation

The Java generator assembles ready-to-wear TOPS+BOTTOMS+FOOTWEAR or DRESSES+FOOTWEAR (optionally plus OUTERWEAR). It never pulls items marked WORN, LAUNDRY, DRYING or REPAIR. Occasion, season and recorded wear counts influence a deterministic ranking; these are **user-provided metadata heuristics**, not objective style ratings. The generator does not check live weather or product specifications. If no full outfit is available, the API provides actionable blockers rather than inventing results. Limit: 1–20 suggestions per request, with conservative computation bounds for large wardrobes.

Generated looks are temporary until the user explicitly saves one, at which point the existing Outfit Studio persists real garment references.
