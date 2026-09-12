import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import About from "@/pages/about";
import Admin from "@/pages/admin";
import ClinicProfile from "@/pages/clinic-profile";
import Clinics from "@/pages/clinics";
import Corrections from "@/pages/corrections";
import Glossary from "@/pages/glossary";
import Home from "@/pages/home";
import Locations from "@/pages/locations";
import NotFound from "@/pages/not-found";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import "./index.css";

const queryClient = new QueryClient();

function AppRouter() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return (
    <ErrorBoundary resetKey={location}>
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
        <Route path="/not-found" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
