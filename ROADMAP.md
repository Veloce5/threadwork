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
