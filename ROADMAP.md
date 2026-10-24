# THREADWORK delivery roadmap

This plan intentionally separates **finished and tested functionality** from proposals. Never mark a phase complete solely because code was generated. Run the acceptance checklist on a real machine first.

## Phase 1 — Foundation (current release: 0.1.0)
- [x] New independent backend and frontend codebase
- [x] Spring Boot garment REST endpoints
- [x] Local file-backed H2 database, PostgreSQL JDBC option
- [x] React wardrobe dashboard and collection UI
- [x] Garment creation/editing/deletion, filtering, status transitions
- [x] JUnit integration tests written; frontend parsing checked
- [ ] Confirm real Maven build + frontend npm build on Mac or GitHub CI
- [ ] Confirm create/edit/delete/status flow in browser and persistence across restart
- [ ] Publish to new `Veloce5/threadwork` GitHub repository

## Phase 2 — Virtual Closet
- [ ] Photo upload, validation and local image serving
- [ ] Garment detail page and image management
- [ ] Extend schema with size, season, material, favorite, and care notes
- [ ] Search/filter refinements and tests

## Phase 3 — Outfit Studio
- [ ] Outfit, outfit_item data models
- [ ] Drag-and-drop outfit creation interface
- [ ] Save/edit/delete combinations; never duplicate garment records
- [ ] Validate unique items and slots in outfit combinations

## Phase 4 — Laundry state engine
- [ ] Explicit allowed garment state transitions
- [ ] Status event history
- [ ] Availability-aware saved outfit views
- [ ] Java tests for dirty, drying, unavailable scenarios

## Phase 5 — Wear history and value
- [ ] Append-only wear events with date and selected outfit
- [ ] Derive wear count and cost-per-wear rather than manually incrementing
- [ ] Analytics chart with honest zero-wear handling

## Phase 6 — Smart outfit generator
- [ ] Filter infeasible combinations first
- [ ] Rank by weather, season, occasion and user preferences
- [ ] Deterministic constraint checking in Java; explain scores
- [ ] Tests for no-available-outfit outcomes

## Phase 7 — Planner and packing
- [ ] Calendar outfit assignments and conflict detection
- [ ] Minimal packing list by set-cover heuristic
- [ ] Explicit user constraints and use cases

## Phase 8 — Optional sponsor integrations
- [ ] Tiger Data PostgreSQL persistent deployment
- [ ] Snowflake independent SQL consistency audit
- [ ] Gemini/ElevenLabs only when available and permitted; never core dependencies

## Phase 9 — Deployment
- [ ] Dockerize API + frontend
- [ ] Vultr service with HTTPS and secret management
- [ ] Authentication, abuse prevention, backup/recovery

## Phase 10 — Demo and submission
- [ ] Full walk-through using one person and truthful demo wardrobe data
- [ ] Error-path testing and responsive layout
- [ ] Public GitHub repo and AI assistance disclosure
- [ ] Video or live demo as required by event rules

**SBUHacks-ready MVP target:** Phase 1–5 critical features plus Phase 6 basic availability-aware suggestions, with a deterministic onstage walkthrough.

## Phase 3 implementation (2026-10-24)
- [x] Spring Boot outfit CRUD API and persistent saved outfits
- [x] Outfits reference real wardrobe garment IDs, not duplicate clothing data
- [x] Live availability calculated from garment status; deleted pieces flagged
- [x] Drag and click outfit canvas organized into five clothing slots
- [x] Named outfit saving, editing, deletion and lookbook previews
- [x] JUnit integration checks for availability, updates and invalid items
- [ ] Verify in user's browser after pulling to Mac

## Phase 4 implementation (2026-10-24)
- [x] Guided laundry actions with allowed transitions
- [x] Status event history for both laundry steps and manual changes
- [x] Wardrobe summary and saved outfit availability share the same garment status
- [x] Deterministic same-category replacement suggestions with occasion/season ordering
- [x] Explicit one-click apply replacement to a saved outfit
- [x] Dedicated Laundry Center screen with care pipeline, outfit recovery and history
- [x] Automated Java tests for transitions, events and replacement integrity
- [ ] Verify in a local browser with the user's saved outfits

## Phase 5 implementation (2026-10-24)\n- [x] Date-stamped, append-only wear events linked to real outfit/garment IDs\n- [x] Server calculates actual recorded wear counts and zero-wear-safe cost-per-wear\n- [x] Historical logging that does not alter today's garment availability\n- [x] Today's logging updates laundry statuses with provenance\n- [x] Analytics screen with wear calendar bars, sortable costs, and event history\n- [x] Java integration checks for outfit wear, cost-per-wear and invalid entries\n- [ ] Confirm new page and recording workflow in local browser\n
## Phase 6 implementation (2026-10-24)
- [x] Java garment availability and outfit feasibility filtering
- [x] Explainable occasion and season preference ranking
- [x] Handles conventional separates or dress + footwear
- [x] Optional required outerwear constraint
- [x] Empty-state reasons rather than inventing unavailable outfits
- [x] Integrated React Smart Outfits page with quick-save to existing outfit records
- [x] JUnit tests for hard constraints, ranking, layering and validation
- [ ] Local browser verification using real saved wardrobe after pulling

## Phase 7 implementation (2026-10-24)
- [x] Persistent morning/afternoon/evening outfit assignments, update and delete
- [x] Warning for shared garments across same-day slots or currently unavailable items
- [x] Two-week interactive calendar with selectable dates and saved outfits
- [x] Activity-based multi-day packing preview using availability-aware Java combinations
- [x] Bounded beam-search heuristic minimizing distinct garments, with transparent assumptions
- [x] Java API tests for calendar replacement, conflicts, packing and incomplete wardrobes
- [ ] Confirm with actual local wardrobe after pulling the new version

## Phase 8 implementation (2026-10-24)
- [x] Java read-only integrity audit of saved garments, outfits, wear totals, photos, calendar links
- [x] Transparent findings and totals in Workspace Health UI
- [x] Local H2 database + photo backup script, archive structure verifier
- [x] Updated privacy guidance and PostgreSQL migration warnings
- [x] JUnit tests for clean state, wear count mismatch and deleted outfit references
- [ ] Browser verification in the user's local app
- [ ] External sponsor integrations: intentionally not connected without credentials and independent testing
