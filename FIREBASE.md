# Firebase backend

Target project: **ivf-directory-india**. The API now uses Cloud Firestore and Firebase Authentication. Firebase Hosting forwards `/api/**` to the `api` Cloud Function in `asia-south1` (Mumbai), using Node.js 22. The existing frontend and REST response shapes are retained.

## Status

The code migration is complete and tested locally. **Production deployment and existing-data migration have not been performed.** Firebase console access was blocked by the browser's security policy during this task. The project's billing, enabled products, web app configuration, and administrator account still need to be checked.

## One-time project setup

1. Open the [Firebase project](https://console.firebase.google.com/project/ivf-directory-india/overview). Cloud Functions deployment requires the Blaze plan; review and enable billing yourself if needed. See [Firebase's setup guide](https://firebase.google.com/docs/functions/get-started).
2. Create the default Cloud Firestore database in native mode, preferably in `asia-south1` to match the function. Use production rules; this repository's rules deny all direct client access.
3. Register a Web app under Project settings. Enable the Google sign-in provider under Authentication and select its support email. Check that the Hosting domain is an authorized authentication domain.
4. Install Node.js 22 and pnpm. Install project dependencies with `pnpm install`. The commands below use the Firebase CLI version tested with this repository: `pnpm dlx firebase-tools@14.17.0`.
5. Authenticate the CLI with `pnpm dlx firebase-tools@14.17.0 login`. Local migration and administrator tools also require Application Default Credentials, for example through `gcloud auth application-default login`. Cloud Functions uses its own runtime service account.

Firebase Hosting supplies the web app configuration through [`/__/firebase/init.json`](https://firebase.google.com/docs/hosting/reserved-urls). For Vite development or another frontend host, copy `artifacts/ivf-directory/.env.example` to `.env.local` in the same directory and fill in the Web app configuration. No service-account key belongs in the frontend.

## Deploy

Run from the repository root:

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server build:firebase
pnpm --filter @workspace/ivf-directory build
pnpm dlx firebase-tools@14.17.0 deploy --project ivf-directory-india --only firestore,functions,hosting
```

The Firebase predeploy hooks rebuild the API and frontend. The generated `.firebase-build` directory contains a standalone deployable function package; it does not require the monorepo or PostgreSQL at runtime. Do not run `firebase init` over the checked-in configuration.

After deployment, verify `/api/healthz`, `/api/clinics`, and `/admin` on the Hosting URL reported by the CLI. An empty new database produces an empty directory until data is imported. The public homepage requires no login.

## Transfer existing PostgreSQL data

The original SQL schemas remain under `lib/db` for type definitions and migration support. The old seeding source is retained under `scripts/legacy` as reference; it is not run by the Firebase backend. Server startup no longer creates fictional records or replaces data.

Take a database backup and pause writes to the old backend during transfer. Set `DATABASE_URL` securely in your local shell to the existing PostgreSQL database. First run the read-only count preview:

```sh
node scripts/migrate-to-firestore.mjs
```

Then transfer to the explicit project:

```sh
node scripts/migrate-to-firestore.mjs --write --project=ivf-directory-india
```

The tool reads a consistent PostgreSQL snapshot, preserves UUIDs, timestamps, date-only fields, publication states and demonstration labels, and embeds clinic-service relationships as `serviceIds`. Historical admin profiles are preserved in `_legacy_admin_profiles`; they do not grant Firebase access. It creates unique-key reservations for clinic/service slugs and source URLs.

Reruns retain identical records and reject differing destination records. Each record is committed atomically with its unique-key reservation. A failed run may have transferred earlier records; rerun after resolving the reported conflict. This is a one-time transfer, not ongoing synchronization. Keep both backends free of administrative writes during the transfer and verify record counts and sample profiles before switching traffic. The source database is never modified.

## Administrator access

Open `/admin` and sign in with the intended Google account once, then locate its UID in Firebase Authentication. From a trusted local shell with the project's credentials:

```sh
node scripts/firebase-admin.mjs FIREBASE_UID grant --project=ivf-directory-india
```

Sign out and back in. Only ID tokens with the `admin: true` [custom claim](https://firebase.google.com/docs/auth/admin/custom-claims) can access admin routes. Revoked or disabled sessions are rejected. To revoke access:

```sh
node scripts/firebase-admin.mjs FIREBASE_UID revoke --project=ivf-directory-india
```

Revocation also invalidates existing sessions. Admin writes create audit records in the same Firestore transaction. The HTTP API preserves its original audit response contract; the actor UID is stored in the database.

## Tests and local development

Install Java 21 for the Firestore emulator. Run the integration suite without contacting the production project:

```sh
pnpm dlx firebase-tools@14.17.0 emulators:exec --project demo-ivf-directory --only auth,firestore 'node scripts/test-firebase.mjs'
```

Tests cover unauthenticated and unauthorized requests, disabled accounts, draft visibility, observation publication, service relationships, concurrent duplicate prevention, date validation, corrections, audit records, direct Firestore access denial, and migration rerun/conflict handling. All test writes use an isolated `demo-` project. Do not point the test suite at the live project.

For local API work, start the Auth and Firestore emulators:

```sh
pnpm dlx firebase-tools@14.17.0 emulators:start --project demo-ivf-directory --only auth,firestore
```

In another terminal:

```sh
GCLOUD_PROJECT=demo-ivf-directory FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 pnpm --filter @workspace/api-server dev
```

The local API listens on port 5001; Vite defaults to 5173 and proxies `/api` there. To exercise local sign-in, set the frontend's `VITE_USE_FIREBASE_EMULATORS=true`, `VITE_FIREBASE_PROJECT_ID=demo-ivf-directory`, and a dummy `VITE_FIREBASE_API_KEY=emulator-key` in `.env.local`. Start the frontend with `pnpm --filter @workspace/ivf-directory dev`. Never set emulator variables in production.

## Scope and operational limits

Public directory queries retain the original in-memory filtering and load all published clinics and observations. This is suitable for the current small directory, but reads grow with dataset size; pagination and indexed search are future work. Function instances are capped at 10, which is not a spending cap.

The existing clinic editor creates drafts and archives records; it does not include a clinic publication action. Existing published clinics retain their status during migration. The CSV screen remains a preview, not a data import. This conversion does not invent success rates or modify reference source files.
