import { lazy, Suspense, useEffect } from "react";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Seo, type SeoMetadata } from "@/components/seo";
import Home from "@/pages/home";

const About = lazy(() => import("@/pages/about"));
const Admin = lazy(() =>
  Promise.all([import("@/components/data-page"), import("@/pages/admin")]).then(
    ([{ DataPage }, { default: Page }]) => ({
      default: () => (
        <DataPage>
          <Page />
        </DataPage>
      ),
    }),
  ),
);
const ClinicProfile = lazy(() =>
  Promise.all([
    import("@/components/data-page"),
    import("@/pages/clinic-profile"),
  ]).then(([{ DataPage }, { default: Page }]) => ({
    default: () => (
      <DataPage>
        <Page />
      </DataPage>
    ),
  })),
);
const Clinics = lazy(() =>
  Promise.all([
    import("@/components/data-page"),
    import("@/pages/clinics"),
  ]).then(([{ DataPage }, { default: Page }]) => ({
    default: () => (
      <DataPage>
        <Page />
      </DataPage>
    ),
  })),
);
const Corrections = lazy(() =>
  Promise.all([
    import("@/components/data-page"),
    import("@/pages/corrections"),
  ]).then(([{ DataPage }, { default: Page }]) => ({
    default: () => (
      <DataPage>
        <Page />
      </DataPage>
    ),
  })),
);
const Glossary = lazy(() => import("@/pages/glossary"));
const Locations = lazy(() =>
  Promise.all([
    import("@/components/data-page"),
    import("@/pages/locations"),
  ]).then(([{ DataPage }, { default: Page }]) => ({
    default: () => (
      <DataPage>
        <Page />
      </DataPage>
    ),
  })),
);
const NotFound = lazy(() => import("@/pages/not-found"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));

const defaultDescription =
  "Explore IVF clinics in India, their reported success rates, and the definitions behind each number.";

const pageMetadata: Record<string, SeoMetadata> = {
  "/": {
    title: "OpenIVF — India’s IVF Clinic Directory",
    description: defaultDescription,
  },
  "/clinics": {
    title: "IVF Clinics in India | OpenIVF",
    description:
      "Search IVF clinics across India and review published success rates with the definitions, patient groups, and sources behind them.",
  },
  "/locations": {
    title: "IVF Clinics by City and Location | OpenIVF",
    description:
      "Browse IVF clinics in India by city and locality, then review each clinic’s published information and sources.",
  },
  "/glossary": {
    title: "Understanding IVF Success Rates | OpenIVF",
    description:
      "Learn what IVF success rates measure, how they are calculated, and why patient groups, outcomes, and reporting periods matter.",
  },
  "/about": {
    title: "About OpenIVF | India’s IVF Clinic Directory",
    description:
      "Learn how OpenIVF helps people explore IVF clinics in India and understand the context behind reported success rates.",
  },
  "/corrections": {
    title: "Suggest a Clinic Update | OpenIVF",
    description:
      "Report missing or outdated information in the OpenIVF clinic directory for review.",
  },
  "/privacy": {
    title: "Privacy Policy | OpenIVF",
    description:
      "Read how OpenIVF collects, uses, and protects information when you use the India IVF clinic directory.",
  },
  "/terms": {
    title: "Terms of Use | OpenIVF",
    description:
      "Read the terms for using OpenIVF as a public reference for IVF clinic information in India.",
  },
  "/admin": {
    title: "Directory Administration | OpenIVF",
    description: "Authorised administration for the OpenIVF directory.",
    robots: "noindex, nofollow",
  },
  "/not-found": {
    title: "Page Not Found | OpenIVF",
    description:
      "The requested page could not be found in the OpenIVF directory.",
    robots: "noindex, nofollow",
  },
};

function AppRouter() {
  const [location] = useLocation();
  const pathname = location.split("?")[0].replace(/\/$/, "") || "/";
  const metadata = pathname.startsWith("/clinics/")
    ? {
        title: "IVF Clinic Profile | OpenIVF",
        description:
          "Review published clinic details, services, and reported IVF success-rate observations with their definitions and sources.",
        robots: "noindex, nofollow",
      }
    : pageMetadata[pathname] || pageMetadata["/not-found"];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return (
    <ErrorBoundary resetKey={location}>
      <Seo {...metadata} />
      <Suspense fallback={<main className="shell-inner" aria-busy="true" />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/clinics" component={Clinics} />
          <Route path="/clinics/:slug" component={ClinicProfile} />
          <Route path="/locations" component={Locations} />
          <Route path="/glossary" component={Glossary} />
          <Route path="/about" component={About} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/corrections" component={Corrections} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppRouter />
    </WouterRouter>
  );
}
