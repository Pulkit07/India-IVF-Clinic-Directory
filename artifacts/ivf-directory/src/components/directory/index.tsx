import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Info,
  MapPin,
  Search,
} from "lucide-react";
import { Link } from "wouter";
import type {
  Clinic,
  Location,
  RateObservation,
} from "@workspace/api-client-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "outline" | "danger";
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="page-intro shell-inner">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      {description && <p className="intro-copy">{description}</p>}
    </section>
  );
}
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`disclaimer ${compact ? "disclaimer-compact" : ""}`}>
      <Info size={17} />
      <span>
        <strong>Medical information note.</strong> Clinic-level statistics
        describe groups of past treatment cycles. They do not predict an
        individual patient’s outcome. Rates calculated using different outcomes,
        denominators, patient groups, or treatment methods may not be
        comparable. This directory provides general information and not medical
        advice.
      </span>
    </div>
  );
}
export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="loading-block" aria-label="Loading">
      <span className="skeleton skeleton-title" />
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function ErrorBlock({ retry }: { retry: () => void }) {
  return (
    <div className="state-card">
      <p className="eyebrow">Could not load this view</p>
      <h2>Something interrupted the connection.</h2>
      <p>Try again, or come back in a moment.</p>
      <Button variant="outline" onClick={retry} data-testid="button-retry">
        Retry
      </Button>
    </div>
  );
}
export function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Search size={20} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function RateDefinition({
  observation,
  expanded = false,
}: {
  observation: RateObservation;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  return (
    <div
      className={`rate-card ${open ? "rate-open" : ""}`}
      data-testid={`rate-observation-${observation.id}`}
    >
      <div className="rate-top">
        <div>
          <p className="rate-label">{observation.outcomeType}</p>
          <p className="rate-definition">{observation.outcomeDefinition}</p>
        </div>
        <div className="rate-value">
          {observation.ratePercentage.toFixed(1)}
          <span>%</span>
        </div>
      </div>
      <div className="rate-context">
        <span>{observation.denominatorType}</span>
        <span>{observation.ageBand}</span>
        <span>{observation.eggSource}</span>
        <span>{observation.treatmentContext}</span>
        <span>{observation.yearLabel}</span>
        <span className="source-badge">{observation.source.sourceType}</span>
        <span className="verification-badge">
          {observation.verificationStatus}
        </span>
        {observation.smallSample && (
          <span className="caveat">Small sample</span>
        )}
      </div>
      {open && (
        <div className="rate-detail">
          <div>
            <span className="detail-label">Denominator</span>
            <strong>{observation.denominatorType}</strong>
            <p>
              {observation.denominatorDefinition}
              {observation.denominatorCount !== null &&
              observation.denominatorCount !== undefined
                ? ` · ${observation.denominatorCount} in denominator`
                : " · Sample size not reported"}
              {observation.numerator !== null &&
              observation.numerator !== undefined
                ? ` · ${observation.numerator} events`
                : ""}
            </p>
          </div>
          <div>
            <span className="detail-label">Context</span>
            <strong>
              {observation.treatmentType} · {observation.treatmentContext}
            </strong>
            <p>
              Egg source: {observation.eggSource}.{" "}
              {observation.ageMeasurementPoint || "Age at treatment start."}
            </p>
          </div>
          <div>
            <span className="detail-label">Reporting period</span>
            <strong>
              {observation.reportingPeriodStart} —{" "}
              {observation.reportingPeriodEnd}
            </strong>
            <p>{observation.methodologyNotes}</p>
          </div>
        </div>
      )}
      <div className="rate-source">
        <FileText size={15} />
        <a href={observation.source.url} target="_blank" rel="noreferrer">
          View direct source
        </a>
        <span>{observation.source.title}</span>
      </div>
      <button
        className="rate-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-testid={`button-rate-details-${observation.id}`}
      >
        {open ? "Hide context" : "See the definition and context"}
        <ChevronDown size={15} className={open ? "rotate-180" : ""} />
      </button>
    </div>
  );
}

export function ClinicCard({ clinic }: { clinic: Clinic }) {
  return (
    <article className="clinic-card" data-testid={`card-clinic-${clinic.id}`}>
      <div className="clinic-card-top">
        <div>
          <span className="status-dot" />{" "}
          <span className="micro-label">
            {clinic.licensingStatus || "Licensing information available"}
          </span>
        </div>
        <span className="reviewed">
          {clinic.demonstrationData
            ? "Demonstration record"
            : `Reviewed ${new Date(clinic.lastReviewedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
        </span>
      </div>
      <Link
        href={`/clinics/${clinic.slug}`}
        className="clinic-card-title"
        data-testid={`link-clinic-${clinic.id}`}
      >
        {clinic.name}
        <ArrowRight size={18} />
      </Link>
      <p className="clinic-location">
        <MapPin size={15} />
        {clinic.city}, {clinic.state}
      </p>
      {clinic.headlineObservation ? (
        <RateDefinition observation={clinic.headlineObservation} />
      ) : (
        <p className="no-rate">
          No eligible rate observation is published for this record.
        </p>
      )}
      <div className="service-row">
        {clinic.services.slice(0, 3).map((service) => (
          <span key={service.id}>{service.name}</span>
        ))}
      </div>
    </article>
  );
}
export function cityFor(location: Pick<Location, "city" | "state">) {
  return location.state.toLowerCase() === "karnataka"
    ? "Bengaluru"
    : location.city;
}
