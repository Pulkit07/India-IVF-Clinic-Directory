# Legacy PostgreSQL reference

`postgres-seed.ts` preserves the original demonstration/Bangalore seeding implementation for reference. It is not an executable Firebase seed command and is excluded from TypeScript compilation. Its original relative imports refer to the former API location.

Use `scripts/migrate-to-firestore.mjs` from the repository root to transfer actual PostgreSQL records. The Firebase API never invokes this legacy seed or deletes/replaces a dataset on startup.
