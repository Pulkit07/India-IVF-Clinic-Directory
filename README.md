# OpenIVF

OpenIVF is a public directory for exploring IVF clinics in India and understanding the context behind their reported success rates. It presents each rate alongside its definition, patient group, reporting period, and source so people can compare information more carefully.

The directory includes clinic and location browsing, detailed clinic profiles, a guide to interpreting IVF success rates, correction submissions, and a protected administration workspace for reviewing and publishing records.

## Technology

OpenIVF is built with React, TypeScript, Vite, and Tailwind CSS. Firebase provides Authentication, Cloud Firestore, Security Rules, and static hosting.

## Run locally

Install dependencies with `pnpm install`, copy `artifacts/ivf-directory/.env.example` to `.env.local`, and add the Firebase web configuration. Then start the app:

```sh
pnpm --filter @workspace/ivf-directory dev
```

## Deploy

Build the app and deploy it to Firebase:

```sh
pnpm --filter @workspace/ivf-directory build
pnpm dlx firebase-tools@14.17.0 deploy --project ivf-directory-india --only firestore,hosting
```

See [FIREBASE.md](FIREBASE.md) for administrator access, emulator testing, and data migration details.

## Disclaimer

OpenIVF provides general information, not medical advice. Reported clinic statistics describe past groups of treatment cycles and do not predict an individual patient’s outcome. Some records may contain fictional demonstration data.
