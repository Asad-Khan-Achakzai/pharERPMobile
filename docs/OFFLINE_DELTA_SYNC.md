# Offline Delta Sync Strategy (Phase 6)

Design-only document for future incremental master-data synchronization.
No breaking API changes are required to adopt this incrementally.

## Goals

- Reduce first-sync and resume-sync payload size for large territories (1000+ doctors)
- Detect server-side deletes without full table refresh
- Preserve existing full-pull behaviour as fallback when `updatedSince` is omitted

## Current State (Phases 1–5)

| Layer | Behaviour |
|-------|-----------|
| Master pull | Full paginated `GET /doctors`, `/pharmacies`, etc. |
| Sync cursors | Reserved in `sync.master.meta` KV (`doctorsSince`, `pharmaciesSince`, …) |
| Mutations | Outbox + `X-Client-Uuid` idempotency |
| Priority | attendance → visit → order → expense → live-tracking → other |

## Backend Readiness Audit

| Entity | List endpoint | `updatedAt` on model | Soft delete | Delta-ready |
|--------|---------------|----------------------|-------------|-------------|
| Doctors | `GET /doctors` | ✅ Mongoose timestamps | ✅ `softDelete` plugin | **High** — add `?updatedSince=` |
| Pharmacies | `GET /pharmacies` | ✅ | ✅ | **High** |
| Products | `GET /products` | ✅ | ✅ | **High** — small catalog, full pull OK |
| Distributors | `GET /distributors` | ✅ | ✅ | **High** |
| Weekly plans | `GET /weekly-plans` | ✅ | ✅ | **Medium** — pull by `scope=self` + date window |
| Plan items | `GET /plan-items/today` | ✅ per item | partial | **Medium** — today bundle + plan detail delta |
| Territories | `GET /territories/tree` | ✅ nodes | ✅ | **Low** — infrequent changes, full tree OK |
| Orders | `GET /orders` | ✅ | ✅ | **Low** for master cache — use outbox for writes |
| Attendance | `GET /attendance/me/today` | ✅ | ✅ | N/A — single-day doc |

### Recommended additive query params (future)

```
GET /doctors?updatedSince=2026-05-20T08:00:00.000Z&includeDeleted=true
GET /pharmacies?updatedSince=...
GET /products?updatedSince=...
```

Response shape (backward compatible):

```json
{
  "data": [ /* changed rows */ ],
  "pagination": { "total": 42 },
  "meta": {
    "syncToken": "2026-05-20T10:15:00.000Z",
    "hasMore": false,
    "deletedIds": ["665abc...", "665def..."]
  }
}
```

When `updatedSince` is **omitted**, behaviour remains identical to today (full paginated list).

## Mobile Implementation Plan (Future Phase 7)

1. After successful full sync, store `meta.syncToken` in `sync.master.meta.doctorsSince`
2. On resume sync, call list endpoints with `updatedSince` cursor
3. Apply upserts to SQLite; apply `deletedIds` as `DELETE FROM doctors WHERE id IN (...)`
4. If server returns `410` or unknown cursor, fall back to full paginated pull
5. Never delete local outbox shadow rows — only server master cache

## Tombstones vs hard delete

Prefer `deletedIds` array in sync response over relying on `isDeleted` flag alone —
mobile cache can purge without scanning full table.

Optional future model field: `deletedAt` ISO on soft-deleted docs for audit.

## Conflict policy

| Scenario | Resolution |
|----------|------------|
| Offline order + server edit same pharmacy | Independent resources — no conflict |
| Offline visit + admin marks plan item missed | Server wins on sync; mobile shows 409 → user action |
| Offline doctor edit + server doctor update | Last-write-wins on sync; idempotency prevents duplicate create |
| Master cache stale doctor name | Delta sync refreshes on next `updatedSince` pull |

## Risks

| Risk | Mitigation |
|------|------------|
| Clock skew on `updatedSince` | Use server-issued `syncToken`, not client clock |
| Missing deletes | Require `includeDeleted=true` or dedicated deletedIds |
| Large delta after long offline | Cap delta pages; fall back to full sync if > N changes |
| API versioning | All params optional — old mobile apps ignore them |

## Migration Impact

- **Backend:** Additive query parsing in list services; no schema migration required
- **Mobile:** Use existing `masterSync.ts` cursors; switch pull functions to delta when cursor present
- **Zero downtime:** Deploy backend first; mobile uses full pull until delta flag in server-config

## Server-config gate (proposed)

```json
{
  "sync": {
    "deltaMasterData": false,
    "deltaMinIntervalMs": 300000
  }
}
```

Mobile reads flag from existing `GET /sync/server-config` before attempting delta pull.

---

*Document version: Phase 6 — May 2026. Implementation deferred until product approves backend delta endpoints.*
