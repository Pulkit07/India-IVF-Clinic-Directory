# India IVF Clinic Directory

An evidence-led clinic directory with a public browsing interface and protected administrator workspace.

## Run and operate

The backend targets Firebase project `ivf-directory-india`. See [FIREBASE.md](FIREBASE.md) for project setup, authentication, deployment, PostgreSQL migration, and emulator testing.

- `pnpm --filter @workspace/api-server dev` — local Express API, default port 5001
- `pnpm --filter @workspace/ivf-directory dev` — frontend, default port 5173
- `pnpm run typecheck` — check all packages
- `pnpm --filter @workspace/api-server build:firebase` — prepare the Cloud Functions package
- `pnpm --filter @workspace/api-spec codegen` — regenerate API clients and validators

## Stack and locations

- React/Vite frontend: `artifacts/ivf-directory`
- Express 5 API and Firebase Cloud Function: `artifacts/api-server`
- Firebase Admin SDK, Firestore storage and Firebase Authentication
- Firestore collections, validation, transactions and unique-key reservations: `artifacts/api-server/src/lib/store.ts`
- REST contract: `lib/api-spec/openapi.yaml`
- Legacy SQL schemas and migration-only PostgreSQL driver: `lib/db`
- Deployment configuration: `firebase.json`, `.firebaserc`, `firestore.rules`

## Backend behavior

Public browsing requires no account and returns only published records. Admin routes require a verified Firebase ID token with the `admin: true` custom claim. Direct browser access to Firestore is denied by rules; the server enforces access and records admin writes atomically with audit events.

The production function runs Node.js 22 in Mumbai (`asia-south1`). Local server startup does not seed, replace or delete data. `DATABASE_URL` is used only by the explicit PostgreSQL migration tool, not by the API runtime.
