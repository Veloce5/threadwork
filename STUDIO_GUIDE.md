# THREADWORK Studio — quick guide

## What's different?

**Today** shows what you planned to wear or suggests a complete look based on your closet. You can switch between scheduled Morning, Afternoon and Evening looks, or explore another suggestion. When clothing is not currently ready, the app tells you why and disables inaccurate wear logging.

**Closet** keeps photographs, filters, editable items and a rainbow color sort.

**Looks** contains Outfit Studio, Smart Outfits and the Planner & Packing tool.

**Care** retains Laundry Center with the complete activity trail; the Today queue is a quicker view with confirmation and safe partial-failure feedback.

**Insights** groups actual Wear Analytics and Workspace Health.

**Wear log safety:** Confirmations protect against accidental permanent entries. The journal is append-only; repeated recordings must represent real wears.

## Run in a separate folder

From the extracted `threadwork-final` folder:

Terminal 1:
```bash
cd backend
PORT=8082 mvn spring-boot:run
```

Terminal 2:
```bash
cd frontend
npm install
THREADWORK_API_TARGET=http://127.0.0.1:8082 npm run dev -- --port 5175
```

Browse http://127.0.0.1:5175. Original application ports 8080/5173 are unaffected. Do not replace the original `backend/data` with a ZIP folder.

## Verify

Run `mvn -f backend/pom.xml test` at repository root, `npm run build --prefix frontend`, then check the Today page, photograph rendering, outfit creation, one wear log, calendar planning, a single care transition and Workspace Health. For the first visit, prefer demo pieces in the isolated copy so no personal data is transferred.

## Build status

This ZIP's source was syntax-parsed using TypeScript's parser. Maven and frontend packages were not available in this isolated build environment, so build and runtime checks must be performed in a configured environment. Keep source backed up before altering your original project.
