import {
  ArrowRight,
  Check,
  ChevronLeft,
  ExternalLink,
  FileText,
  Landmark,
  Link as LinkIcon,
  Mail,
  Phone,
  Search,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "wouter";
import type { ClinicProfile } from "@workspace/api-client-react";
import {
  Disclaimer,
  EmptyBlock,
  ErrorBlock,
  Eyebrow,
  LoadingBlock,
  RateDefinition,
} from "@/components/directory";
import { Seo } from "@/components/seo";
import { Shell } from "@/components/site-shell";
import { getGetClinicQueryKey, useGetClinic } from "@/lib/directory-hooks";

export default function ClinicProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const profile = useGetClinic(slug, {
    query: { queryKey: getGetClinicQueryKey(slug) },
  });
  const clinic = profile.data as ClinicProfile | undefined;

  const isNotFound =
    profile.error instanceof Error &&
    profile.error.message.toLowerCase().includes("clinic not found");

  if (profile.isLoading)
    return (
      <Shell>
        <div className="shell-inner">
          <LoadingBlock lines={6} />
        </div>
      </Shell>
    );
  if (isNotFound)
    return (
      <Shell>
        <Seo
          title="Clinic Not Found | OpenIVF"
          description="This clinic profile could not be found in the OpenIVF directory."
          robots="noindex, nofollow"
        />
        <div className="shell-inner">
          <div className="state-card clinic-not-found" role="status">
            <SearchX size={28} aria-hidden="true" />
            <p className="eyebrow">Clinic not found</p>
            <h1>We couldn’t find this clinic.</h1>
            <p>
              It may have moved, changed its web address, or no longer be listed
              in the directory.
            </p>
            <div className="state-actions">
              <Link
                href="/clinics"
                className="btn btn-primary"
                data-testid="link-clinic-not-found-search"
              >
                <Search size={16} /> Search clinics
              </Link>
              <Link
                href="/locations"
                className="btn btn-outline"
                data-testid="link-clinic-not-found-locations"
              >
                Browse locations
              </Link>
            </div>
          </div>
        </div>
      </Shell>
    );
  if (profile.isError || !clinic)
    return (
      <Shell>
        <div className="shell-inner">
          <ErrorBlock retry={() => profile.refetch()} />
        </div>
      </Shell>
    );
  return (
    <Shell>
      <Seo
        title={`${clinic.name} in ${clinic.city}, ${clinic.state} | OpenIVF`}
        description={`View published details, services, and reported IVF success-rate observations for ${clinic.name} in ${clinic.city}, ${clinic.state}.`}
        canonicalPath={`/clinics/${encodeURIComponent(clinic.slug)}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "MedicalClinic",
          name: clinic.name,
          ...(clinic.website ? { sameAs: clinic.website } : {}),
          ...(clinic.phone ? { telephone: clinic.phone } : {}),
          ...(clinic.email ? { email: clinic.email } : {}),
          address: {
            "@type": "PostalAddress",
            ...(clinic.address ? { streetAddress: clinic.address } : {}),
            addressLocality: clinic.city,
            addressRegion: clinic.state,
            addressCountry: "IN",
          },
          medicalSpecialty: "ReproductiveMedicine",
          availableService: clinic.services.map((service) => ({
            "@type": "MedicalProcedure",
            name: service.name,
          })),
        }}
      />
      <div className="shell-inner profile-page">
        <Link
          href="/clinics"
          className="back-link"
          data-testid="link-back-clinics"
        >
          <ChevronLeft size={16} />
          All clinics
        </Link>
        <div className="profile-heading">
          <div>
            <Eyebrow>
              {clinic.city}, {clinic.state}
            </Eyebrow>
            <h1>{clinic.name}</h1>
            <p className="profile-address">
              {clinic.address || "Address not published"}{" "}
            </p>
          </div>
          <div className="profile-stamp">
            <Check size={15} />
            Record reviewed
            <br />
            <strong>
              {new Date(clinic.lastReviewedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </strong>
          </div>
        </div>
        <div className="profile-grid">
          <div className="profile-main">
            <section className="profile-section observation-section">
              <div className="section-heading">
                <div>
                  <Eyebrow>Published observations</Eyebrow>
                  <h2>Read the rate in full.</h2>
                </div>
                <span className="section-count">
                  {clinic.observations.length}{" "}
                  {clinic.observations.length === 1
                    ? "observation"
                    : "observations"}
                </span>
              </div>
              {clinic.observations.length ? (
                clinic.observations.map((o) => (
                  <RateDefinition observation={o} expanded key={o.id} />
                ))
              ) : (
                <EmptyBlock
                  title="No observations published yet."
                  body="The absence of a published observation is not a statement about a clinic's outcomes."
                />
              )}
            </section>
            <section className="profile-section">
              <Eyebrow>Clinic details</Eyebrow>
              <h2>Services and oversight</h2>
              <div className="detail-columns">
                <div>
                  <span className="detail-label">Services</span>
                  <div className="service-pills">
                    {clinic.services.map((service) => (
                      <span key={service.id}>{service.name}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="detail-label">Regulator</span>
                  <p className="detail-value">
                    <Landmark size={16} />
                    {clinic.regulator || "Not published"}
                  </p>
                  <span className="detail-label">Licensing status</span>
                  <p className="detail-value">
                    <ShieldCheck size={16} />
                    {clinic.licensingStatus || "Not published"}
                  </p>
                </div>
              </div>
            </section>
            <section className="profile-section sources-section">
              <div className="section-heading">
                <div>
                  <Eyebrow>Sources</Eyebrow>
                  <h2>Where this information comes from.</h2>
                </div>
              </div>
              {clinic.observations.map((o) => (
                <div className="source-row" key={o.source.id}>
                  <FileText size={17} />
                  <div>
                    <strong>{o.source.title}</strong>
                    <p>
                      {o.source.publisher || o.source.sourceType}
                      {o.source.publishedOn ? ` · ${o.source.publishedOn}` : ""}
                    </p>
                  </div>
                  {o.source.url && (
                    <a
                      href={o.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="icon-link"
                      data-testid={`link-source-${o.source.id}`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))}
            </section>
          </div>
          <aside className="profile-sidebar">
            <div className="contact-card">
              <Eyebrow>Contact and visit</Eyebrow>
              <h3>Continue your research directly.</h3>
              {clinic.phone && (
                <a
                  href={`tel:${clinic.phone}`}
                  className="contact-row"
                  data-testid="link-clinic-phone"
                >
                  <Phone size={16} />
                  {clinic.phone}
                </a>
              )}
              {clinic.email && (
                <a
                  href={`mailto:${clinic.email}`}
                  className="contact-row"
                  data-testid="link-clinic-email"
                >
                  <Mail size={16} />
                  {clinic.email}
                </a>
              )}
              {clinic.website && (
                <a
                  href={clinic.website}
                  target="_blank"
                  rel="noreferrer"
                  className="contact-row"
                  data-testid="link-clinic-website"
                >
                  <LinkIcon size={16} />
                  Clinic website <ExternalLink size={13} />
                </a>
              )}
              <div className="contact-rule" />
              <Link
                href={`/corrections?clinic=${clinic.slug}`}
                className="text-link"
                data-testid="link-profile-correction"
              >
                Suggest a correction <ArrowRight size={16} />
              </Link>
            </div>
            <Disclaimer compact />
          </aside>
        </div>
      </div>
    </Shell>
  );
}
