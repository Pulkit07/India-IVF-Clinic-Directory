# India IVF Clinic Directory

An evidence-led clinic directory with a public browsing interface and protected administrator workspace.

## Run and operate

The backend targets Firebase project `ivf-directory-india`. See [FIREBASE.md](FIREBASE.md) for project setup, authentication, deployment, PostgreSQL migration, and emulator testing.

- `pnpm --filter @workspace/ivf-directory dev` — frontend, default port 5173
- `pnpm run typecheck` — check all packages
- `pnpm --filter @workspace/api-spec codegen` — regenerate API clients and validators

## Stack and locations

- React/Vite frontend: `artifacts/ivf-directory`
- Firebase Web SDK, Firestore storage and Firebase Authentication
- Firestore data access and transactions: `artifacts/ivf-directory/src/lib/directory-store.ts`
- Authorization and validation: `firestore.rules`
- REST contract: `lib/api-spec/openapi.yaml`
- Legacy SQL schemas and migration-only PostgreSQL driver: `lib/db`
- Deployment configuration: `firebase.json`, `.firebaserc`, `firestore.rules`

## Backend behavior

Public browsing requires no account and queries only published records. Admin access is stored in `admin_access/{uid}` and checked by Firestore Rules. Admin writes use transactions that also create immutable audit events. No Cloud Function or Blaze plan is required. `DATABASE_URL` is used only by the explicit PostgreSQL migration tool.
