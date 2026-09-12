# Firebase deployment

The app targets Firebase project `ivf-directory-india` and works on the no-cost Spark plan. The browser uses Firebase Authentication and Cloud Firestore directly; Firestore Security Rules enforce public visibility, administrator access, data validation, unique keys and atomic audit records. Firebase Hosting serves the static Vite build. No Cloud Function is deployed.

## Configured project state

- Standard Firestore database in `asia-south1` (Mumbai)
- Google sign-in enabled with public name `OpenIVF`
- `OpenIVF Web` registered with Hosting site `ivf-directory-india`
- Web configuration stored in ignored `artifacts/ivf-directory/.env.local`
- Direct-access emulator suite: 47 checks passing

## Deploy

Authenticate the Firebase CLI, then run from the repository root:

```sh
pnpm run typecheck
pnpm --filter @workspace/ivf-directory build
pnpm dlx firebase-tools@14.17.0 deploy --project ivf-directory-india --only firestore,hosting
```

Hosting serves the single-page application and supplies Firebase configuration through `/__/firebase/init.json`. The public directory queries only clinics and observations whose `recordStatus` or `publicationStatus` is `published`. Drafts, sources, correction messages, unique-key reservations, audit events and administrator records remain private.

## Administrator access

First sign in at `/admin`, then find the account UID under Firebase Authentication > Users. From a trusted shell with Application Default Credentials, grant access with:

```sh
node scripts/firebase-admin.mjs FIREBASE_UID grant --project=ivf-directory-india
```

Revoke access immediately with:

```sh
node scripts/firebase-admin.mjs FIREBASE_UID revoke --project=ivf-directory-india
```

The browser cannot create or change `admin_access` records. Rules check the record for every protected operation, so revocation does not wait for an ID-token refresh.

## Transfer existing PostgreSQL data

Set `DATABASE_URL` to the existing PostgreSQL database. Preview record counts without writing:

```sh
node scripts/migrate-to-firestore.mjs
```

Then transfer to the explicit project:

```sh
node scripts/migrate-to-firestore.mjs --write --project=ivf-directory-india
```

The tool reads a consistent, read-only PostgreSQL snapshot and preserves IDs, timestamps, publication states and clinic-service relationships. It never modifies PostgreSQL. Reruns retain identical records and reject conflicts instead of overwriting them. Pause old-backend writes during transfer and verify counts before switching traffic.

## Test locally

Java 21 is required by the Firestore emulator:

```sh
pnpm dlx firebase-tools@14.17.0 emulators:exec --project demo-ivf-directory --only auth,firestore 'node artifacts/ivf-directory/tests/firestore.test.mjs'
```

The tests cover public queries, private drafts and correction data, administrator revocation, validation, source snapshots, publication workflow, unique-key races, immutable audits and CSV preview. All writes use an isolated `demo-` project.

For local sign-in, set `VITE_USE_FIREBASE_EMULATORS=true`, `VITE_FIREBASE_PROJECT_ID=demo-ivf-directory` and `VITE_FIREBASE_API_KEY=emulator-key` in `.env.local`, start the Auth and Firestore emulators, then run `pnpm --filter @workspace/ivf-directory dev`.

## Limits

The current public directory loads all published clinics and then one published-observation query per clinic. This suits the current small directory but should move to denormalized public documents or pagination as the dataset grows. Spark quotas still apply; the project does not incur pay-as-you-go charges unless its billing plan is changed separately.
