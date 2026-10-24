# THREADWORK data protection

The local version stores important information outside Git in **backend/data/**. The database contains garments, outfits, wear history, laundry status history and planned outfits. `backend/data/photos/` contains original clothing images.

## Safe Mac backup

1. Stop the Spring Boot backend using Control+C. Leave the working app's data intact.
2. From the **inner Git repository**:
   ```bash
   cd ~/Desktop/Codes/Hackathons/SBUHacks/threadwork/threadwork
   bash scripts/backup-local.sh
   ```
3. The script creates `backups/threadwork-YYYYMMDD-HHMMSS.tar.gz`. It does not change application data.
4. Optionally verify:
   ```bash
   bash scripts/check-local-backup.sh backups/threadwork-YYYYMMDD-HHMMSS.tar.gz
   ```
   Substitute the filename printed by the backup script.
5. Keep a copy somewhere private. Archives may contain personal clothing photos, notes, and purchase history. **Never commit the archive to a public repository.**

The backup script deliberately refuses to operate when port 8080 or the H2 database lock suggests the backend is running. Always stop Spring Boot before copying a file-backed database. Archives are ignored by Git.

## Restore a local H2 archive

Restoration should only be done when necessary, with both application servers stopped.

1. Confirm the archive with the check script.
2. Preserve your existing directory **before** restoring:
   ```bash
   mv backend/data "backend/data.before-restore-$(date +%Y%m%d-%H%M%S)"
   ```
3. Extract the chosen archive into the backend folder:
   ```bash
   tar -xzf backups/YOUR_ARCHIVE.tar.gz -C backend
   ```
4. Start the backend and frontend as documented in README.md and verify a garment and saved outfit.

These steps leave the previous `backend/data.before-restore-...` as a separate recovery copy. They do not migrate between H2 and PostgreSQL. They should not be used when the server is running.

## PostgreSQL / Tiger Data

The app includes a PostgreSQL JDBC driver. Set `DB_URL`, `DB_USER`, and `DB_PASSWORD` privately before starting to connect to an **existing** PostgreSQL database. The schema is managed by Hibernate `ddl-auto=update`; for a serious hosted deployment, replace this with reviewed versioned migrations. A fresh PostgreSQL database will **not** contain your old H2 wardrobe records automatically.

The local H2 backup script **does not** back up a PostgreSQL instance. Use the provider's documented backups, or `pg_dump` / `pg_restore` with appropriate credentials and roles. Never publish credentials or SQL dumps containing your wardrobe data.

## Auditing

Workspace Health checks internal consistency of wear totals, garment statuses, photo file presence, and saved outfit and calendar references. It is read-only and requires no API key. It does not constitute a database backup or scientific verification and cannot prove that all business rules are correct.

## Deployment warning

THREADWORK does not currently support user accounts or authenticated access. **Do not expose the API publicly** until access control, secure uploads, HTTPS, and backups are properly configured. The status-audit endpoint also exposes workspace metadata and must be protected when authentication is implemented.
