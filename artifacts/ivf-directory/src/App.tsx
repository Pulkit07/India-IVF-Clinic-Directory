import { SuccessRateGuide } from '@/components/success-rate-guide';
import { AdminGate } from "@/components/admin-gate";
import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ClipboardCheck, ExternalLink, FileText, Globe2, Info, Landmark, Link as LinkIcon, Mail, MapPin, Phone, Plus, Search, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import {
  getGetAdminSummaryQueryKey,
  getGetClinicQueryKey,
  getListAdminClinicsQueryKey,
  getListAuditEventsQueryKey,
  getListClinicsQueryKey,
  getListLocationsQueryKey,
  getListRateObservationsQueryKey,
  getListServicesQueryKey,
  getListSourcesQueryKey,
  useArchiveClinic,
  useCreateClinic,
  useCreateRateObservation,
  useCreateService,
  useCreateSource,
  useGetAdminSummary,
  useGetClinic,
  useListAdminClinics,
  useListAuditEvents,
  useListClinics,
  useListLocations,
  useListRateObservations,
  useListServices,
  useListSources,
  usePreviewImport,
  usePublishRateObservation,
  useSubmitCorrection,
  useUnpublishRateObservation,
  useUpdateClinic,
} from '@workspace/api-client-react';
import type { Clinic, ClinicProfile, Location, RateObservation, Service } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();

const navItems = [
  { href: '/clinics', label: 'Find a clinic' },
  { href: '/locations', label: 'Locations' },
  { href: '/glossary', label: 'Behind the Rates' },
];

function Button({ children, variant = 'primary', className = '', ...props }: { children: React.ReactNode; variant?: 'primary' | 'quiet' | 'outline' | 'danger'; className?: string; [key: string]: unknown }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

function Logo() {
  return <Link href="/" className="brand" data-testid="link-home"><span>Open<span className="openivf-name">IVF</span></span></Link>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">
    <header className="site-header">
      <div className="shell-inner header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Primary navigation">{navItems.map(item => <Link key={item.href} href={item.href} className="nav-link" data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.label}</Link>)}</nav>
        <div className="header-actions">
          <Link href="/about" className="header-about" data-testid="link-about">About this directory</Link>
        </div>
      </div>
    </header>
    <main>{children}</main>
    <Footer />
  </div>;
}

function Footer() {
  return <footer className="site-footer"><div className="shell-inner footer-grid">
    <div><Logo /><p className="footer-note">A public reference for understanding IVF clinic information in India.</p></div>
    <div><p className="footer-heading">Explore</p>{navItems.slice(0, 2).map(i => <Link key={i.href} href={i.href} className="footer-link" data-testid={`footer-link-${i.label.toLowerCase().replaceAll(' ', '-')}`}>{i.label}</Link>)}</div>
    <div><p className="footer-heading">Read first</p><Link href="/glossary" className="footer-link" data-testid="footer-link-glossary">Behind the Rates</Link></div>
    <div><p className="footer-heading">Project</p><Link href="/about" className="footer-link" data-testid="footer-link-about">About</Link><Link href="/corrections" className="footer-link" data-testid="footer-link-corrections">Suggest a correction</Link><Link href="/privacy" className="footer-link" data-testid="footer-link-privacy">Privacy</Link><Link href="/terms" className="footer-link" data-testid="footer-link-terms">Terms</Link></div>
  </div><div className="shell-inner footer-bottom"><span>Demonstration directory · India</span><span>Information, not medical advice.</span></div></footer>;
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="eyebrow">{children}</p>; }
function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) { return <section className="page-intro shell-inner"><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1>{description && <p className="intro-copy">{description}</p>}</section>; }
function Disclaimer({ compact = false }: { compact?: boolean }) { return <div className={`disclaimer ${compact ? 'disclaimer-compact' : ''}`}><Info size={17} /><span><strong>Medical information note.</strong> Clinic-level statistics describe groups of past treatment cycles. They do not predict an individual patient’s outcome. Rates calculated using different outcomes, denominators, patient groups, or treatment methods may not be comparable. This directory provides general information and not medical advice.</span></div>; }
function LoadingBlock({ lines = 3 }: { lines?: number }) { return <div className="loading-block" aria-label="Loading"><span className="skeleton skeleton-title" />{Array.from({ length: lines }).map((_, i) => <span key={i} className="skeleton" />)}</div>; }
function ErrorBlock({ retry }: { retry: () => void }) { return <div className="state-card"><p className="eyebrow">Could not load this view</p><h2>Something interrupted the connection.</h2><p>Try again, or come back in a moment.</p><Button variant="outline" onClick={retry} data-testid="button-retry">Retry</Button></div>; }
function EmptyBlock({ title, body }: { title: string; body: string }) { return <div className="empty-state"><div className="empty-icon"><Search size={20} /></div><h3>{title}</h3><p>{body}</p></div>; }

function RateDefinition({ observation, expanded = false }: { observation: RateObservation; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  return <div className={`rate-card ${open ? 'rate-open' : ''}`} data-testid={`rate-observation-${observation.id}`}>
    <div className="rate-top"><div><p className="rate-label">{observation.outcomeType}</p><p className="rate-definition">{observation.outcomeDefinition}</p></div><div className="rate-value">{observation.ratePercentage.toFixed(1)}<span>%</span></div></div>
    <div className="rate-context"><span>{observation.denominatorType}</span><span>{observation.ageBand}</span><span>{observation.eggSource}</span><span>{observation.treatmentContext}</span><span>{observation.yearLabel}</span><span className="source-badge">{observation.source.sourceType}</span><span className="verification-badge">{observation.verificationStatus}</span>{observation.smallSample && <span className="caveat">Small sample</span>}</div>
    {open && <div className="rate-detail"><div><span className="detail-label">Denominator</span><strong>{observation.denominatorType}</strong><p>{observation.denominatorDefinition}{observation.denominatorCount ? ` · ${observation.denominatorCount} people` : ''}{observation.numerator !== null && observation.numerator !== undefined ? ` · ${observation.numerator} events` : ''}</p></div><div><span className="detail-label">Context</span><strong>{observation.treatmentContext}</strong><p>Egg source: {observation.eggSource}. {observation.ageMeasurementPoint || 'Age at treatment start.'}</p></div><div><span className="detail-label">Reporting period</span><strong>{observation.reportingPeriodStart} — {observation.reportingPeriodEnd}</strong><p>{observation.methodologyNotes}</p></div><div className="source-inline"><FileText size={15} /><span>Source: {observation.source.title}</span></div></div>}
    {open && <div className="rate-detail"><div><span className="detail-label">Denominator</span><strong>{observation.denominatorType}</strong><p>{observation.denominatorDefinition}{observation.denominatorCount !== null && observation.denominatorCount !== undefined ? ` · ${observation.denominatorCount} in denominator` : ' · Sample size not reported'}{observation.numerator !== null && observation.numerator !== undefined ? ` · ${observation.numerator} events` : ''}</p></div><div><span className="detail-label">Context</span><strong>{observation.treatmentType} · {observation.treatmentContext}</strong><p>Egg source: {observation.eggSource}. {observation.ageMeasurementPoint || 'Age at treatment start.'}</p></div><div><span className="detail-label">Reporting period</span><strong>{observation.reportingPeriodStart} — {observation.reportingPeriodEnd}</strong><p>{observation.methodologyNotes}</p></div></div>}
    <div className="rate-source"><FileText size={15} /><a href={observation.source.url} target="_blank" rel="noreferrer">View direct source</a><span>{observation.source.title}</span></div>
    <button className="rate-toggle" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={`button-rate-details-${observation.id}`}>{open ? 'Hide context' : 'See the definition and context'}<ChevronDown size={15} className={open ? 'rotate-180' : ''} /></button>
  </div>;
}

function ClinicCard({ clinic }: { clinic: Clinic }) {
  return <article className="clinic-card" data-testid={`card-clinic-${clinic.id}`}>
    <div className="clinic-card-top"><div><span className="status-dot" /> <span className="micro-label">{clinic.licensingStatus || 'Licensing information available'}</span></div><span className="reviewed">{clinic.demonstrationData ? 'Demonstration record' : `Reviewed ${new Date(clinic.lastReviewedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}</span></div>
    <Link href={`/clinics/${clinic.slug}`} className="clinic-card-title" data-testid={`link-clinic-${clinic.id}`}>{clinic.name}<ArrowRight size={18} /></Link>
    <p className="clinic-location"><MapPin size={15} />{clinic.city}, {clinic.state}</p>
    {clinic.headlineObservation ? <RateDefinition observation={clinic.headlineObservation} /> : <p className="no-rate">No eligible rate observation is published for this record.</p>}
    <div className="service-row">{clinic.services.slice(0, 3).map(service => <span key={service.id}>{service.name}</span>)}</div>
  </article>;
}

function Home() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocation(`/clinics${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return <Shell>
    <section className="home-intro shell-inner">
      <Eyebrow>India IVF clinic directory</Eyebrow>
      <h1>IVF success rates.<br /><em>Clearly explained.</em></h1>
      <p className="home-summary">A clinic’s success rate tells only part of the story. What counts as success—and who gets counted—can change the number.</p>
      <p className="home-definitions-copy">OpenIVF brings together Indian IVF clinics, their reported rates and the definitions behind them.</p>
      <form className="search-box" onSubmit={submit}>
        <Search size={20} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by clinic or city" aria-label="Search by clinic or city" data-testid="input-home-search" />
        <button type="submit" aria-label="Find clinics" data-testid="button-home-search"><ArrowRight size={20} /></button>
      </form>
      <Link href="/clinics" className="text-link home-browse" data-testid="link-browse-clinics">Browse all clinics <ArrowRight size={16} /></Link>
    </section>

    <section className="home-definitions shell-inner" aria-labelledby="home-definitions-title">
      <div className="section-heading">
        <div><Eyebrow>Understanding the numbers</Eyebrow><h2 id="home-definitions-title">What does “success” mean?</h2></div>
        <Link href="/glossary" className="text-link" data-testid="link-home-glossary">Behind the rates <ArrowRight size={16} /></Link>
      </div>
      <p className="home-definitions-copy">A percentage needs two definitions: what was counted as success, and which treatment cycles were included.</p>
      <div className="home-definition-grid">
        <article><span className="detail-label">The outcome</span><h3>Pregnancy or live birth?</h3><p>A clinic may report clinical pregnancies or live births. These measure different outcomes.</p></article>
        <article><span className="detail-label">The denominator</span><h3>Out of which cycles?</h3><p>A rate may be calculated per cycle started, egg retrieval, or embryo transfer.</p></article>
        <article><span className="detail-label">The context</span><h3>For whom, and when?</h3><p>Age, egg source and reporting period help explain who a rate describes.</p></article>
      </div>
    </section>

    <section className="home-purpose shell-inner" aria-labelledby="home-purpose-title">
      <div><Eyebrow>Why this directory exists</Eyebrow><h2 id="home-purpose-title">A higher number needs a closer look.</h2></div>
      <div><p>Counting only selected patients or leaving some treatment cycles out can make a reported rate look higher. Without those details, two percentages can appear comparable even when they measure different things.</p><p>We put each reported rate beside its definition and source so you can see what it includes, what is missing, and what to ask the clinic.</p><Link href="/glossary" className="text-link" data-testid="link-home-methodology">Understand success rates <ArrowRight size={16} /></Link></div>
    </section>
    <div className="shell-inner home-data-note"><p>Currently showing fictional demonstration records. Reported rates describe past outcomes and do not predict an individual’s result.</p></div>
  </Shell>;
}

function cityFor(location: Pick<Location, 'city' | 'state'>) {
  return location.state.toLowerCase() === 'karnataka' ? 'Bengaluru' : location.city;
}

function Clinics() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(
    typeof window !== 'undefined'
      ? window.location.search
      : location.split('?')[1] || '',
  );
  const [search, setSearch] = useState(params.get('q') || '');
  const [filters, setFilters] = useState({ city: params.get('city') || '', location: params.get('location') || '' });
  const apiParams = useMemo(() => ({ q: search || undefined, location: filters.location || undefined }), [search, filters.location]);
  const result = useListClinics(apiParams, { query: { queryKey: getListClinicsQueryKey(apiParams) } });
  const data = result.data;
  const cities = [...new Set((data?.availableLocations || []).map(cityFor))].sort();
  const localities = (data?.availableLocations || []).filter(item => !filters.city || cityFor(item) === filters.city);
  const visibleClinics = (data?.items || []).filter(clinic => !filters.city || cityFor(clinic) === filters.city);
  const update = (key: keyof typeof filters, value: string) => { const next = { ...filters, [key]: value }; if (key === 'city') next.location = ''; setFilters(next); const nextParams = new URLSearchParams(); if (search) nextParams.set('q', search); Object.entries(next).forEach(([k, v]) => v && nextParams.set(k, v)); setLocation(`/clinics${nextParams.toString() ? `?${nextParams}` : ''}`); };
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); const next = new URLSearchParams(); if (search) next.set('q', search); Object.entries(filters).forEach(([k, v]) => v && next.set(k, v)); setLocation(`/clinics${next.toString() ? `?${next}` : ''}`); };
  return <Shell><PageIntro eyebrow="Public directory" title="Find a clinic with context." description="Search published clinic records and read each observation on its own terms. There is no overall ranking here." /><div className="shell-inner directory-layout"><aside className="filter-panel"><div className="filter-header"><span className="eyebrow">Refine results</span></div><label className="field-label">City<select value={filters.city} onChange={e => update('city', e.target.value)} data-testid="select-filter-city"><option value="">All cities</option>{cities.map(city => <option value={city} key={city}>{city}</option>)}</select></label><label className="field-label">Location<select value={filters.location} onChange={e => update('location', e.target.value)} data-testid="select-filter-location"><option value="">All locations</option>{localities.map((item: Location) => <option value={item.slug} key={item.slug}>{item.city}</option>)}</select></label><button className="clear-filters" onClick={() => { setFilters({ city: '', location: '' }); setLocation(search ? `/clinics?q=${encodeURIComponent(search)}` : '/clinics'); }} data-testid="button-clear-filters">Clear filters</button></aside><div className="directory-results"><div className="directory-toolbar"><form className="directory-search" onSubmit={submitSearch}><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Clinic, city or location" aria-label="Search directory" data-testid="input-directory-search" /><button type="submit" data-testid="button-directory-search"><ArrowRight size={17} /></button></form></div><div className="results-meta"><span data-testid="text-results-count">{data ? `${visibleClinics.length} ${visibleClinics.length === 1 ? 'clinic' : 'clinics'}` : 'Clinics'}</span>{Object.values(filters).some(Boolean) && <span className="active-filter-note">Filtered results <button onClick={() => { setFilters({ city: '', location: '' }); setLocation('/clinics'); }} data-testid="button-reset-active-filter">Reset</button></span>}</div>{result.isLoading ? <LoadingBlock lines={5} /> : result.isError ? <ErrorBlock retry={() => result.refetch()} /> : visibleClinics.length ? <div className="clinic-list">{visibleClinics.map((clinic: Clinic) => <ClinicCard clinic={clinic} key={clinic.id} />)}</div> : <EmptyBlock title="No clinics match those filters." body="Try another city or location." />}</div></div><div className="shell-inner directory-disclaimer"><Disclaimer compact /></div></Shell>;
}

function ClinicProfilePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const profile = useGetClinic(slug, { query: { queryKey: getGetClinicQueryKey(slug) } });
  const clinic = profile.data as ClinicProfile | undefined;
  if (profile.isLoading) return <Shell><div className="shell-inner"><LoadingBlock lines={6} /></div></Shell>;
  if (profile.isError || !clinic) return <Shell><div className="shell-inner"><ErrorBlock retry={() => profile.refetch()} /></div></Shell>;
  return <Shell><div className="shell-inner profile-page"><Link href="/clinics" className="back-link" data-testid="link-back-clinics"><ChevronLeft size={16} />All clinics</Link><div className="profile-heading"><div><Eyebrow>{clinic.city}, {clinic.state}</Eyebrow><h1>{clinic.name}</h1><p className="profile-address">{clinic.address || 'Address not published'} </p></div><div className="profile-stamp"><Check size={15} />Record reviewed<br /><strong>{new Date(clinic.lastReviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div></div><div className="profile-grid"><div className="profile-main"><section className="profile-section observation-section"><div className="section-heading"><div><Eyebrow>Published observations</Eyebrow><h2>Read the rate in full.</h2></div><span className="section-count">{clinic.observations.length} {clinic.observations.length === 1 ? 'observation' : 'observations'}</span></div>{clinic.observations.length ? clinic.observations.map(o => <RateDefinition observation={o} expanded key={o.id} />) : <EmptyBlock title="No observations published yet." body="The absence of a published observation is not a statement about a clinic's outcomes." />}</section><section className="profile-section"><Eyebrow>Clinic details</Eyebrow><h2>Services and oversight</h2><div className="detail-columns"><div><span className="detail-label">Services</span><div className="service-pills">{clinic.services.map(service => <span key={service.id}>{service.name}</span>)}</div></div><div><span className="detail-label">Regulator</span><p className="detail-value"><Landmark size={16} />{clinic.regulator || 'Not published'}</p><span className="detail-label">Licensing status</span><p className="detail-value"><ShieldCheck size={16} />{clinic.licensingStatus || 'Not published'}</p></div></div></section><section className="profile-section sources-section"><div className="section-heading"><div><Eyebrow>Sources</Eyebrow><h2>Where this information comes from.</h2></div></div>{clinic.observations.map(o => <div className="source-row" key={o.source.id}><FileText size={17} /><div><strong>{o.source.title}</strong><p>{o.source.publisher || o.source.sourceType}{o.source.publishedOn ? ` · ${o.source.publishedOn}` : ''}</p></div>{o.source.url && <a href={o.source.url} target="_blank" rel="noreferrer" className="icon-link" data-testid={`link-source-${o.source.id}`}><ExternalLink size={16} /></a>}</div>)}</section></div><aside className="profile-sidebar"><div className="contact-card"><Eyebrow>Contact and visit</Eyebrow><h3>Continue your research directly.</h3>{clinic.phone && <a href={`tel:${clinic.phone}`} className="contact-row" data-testid="link-clinic-phone"><Phone size={16} />{clinic.phone}</a>}{clinic.email && <a href={`mailto:${clinic.email}`} className="contact-row" data-testid="link-clinic-email"><Mail size={16} />{clinic.email}</a>}{clinic.website && <a href={clinic.website} target="_blank" rel="noreferrer" className="contact-row" data-testid="link-clinic-website"><LinkIcon size={16} />Clinic website <ExternalLink size={13} /></a>}<div className="contact-rule" /><Link href={`/corrections?clinic=${clinic.slug}`} className="text-link" data-testid="link-profile-correction">Suggest a correction <ArrowRight size={16} /></Link></div><Disclaimer compact /></aside></div></div></Shell>;
}

function Locations() {
  const locations = useListLocations({ query: { queryKey: getListLocationsQueryKey() } });
  const [city, setCity] = useState('');
  const cities = [...new Set((locations.data || []).map(cityFor))].sort();
  const localities = (locations.data || []).filter(item => !city || cityFor(item) === city);
  return <Shell><PageIntro eyebrow="Browse by place" title="Find care by city and location." description="Choose a city to see the localities where clinics are listed." /><div className="shell-inner locations-page"><div className="location-city-filter"><label className="field-label">City<select value={city} onChange={event => setCity(event.target.value)} data-testid="select-locations-city"><option value="">All cities</option>{cities.map(item => <option value={item} key={item}>{item}</option>)}</select></label></div>{locations.isLoading ? <LoadingBlock lines={4} /> : locations.isError ? <ErrorBlock retry={() => locations.refetch()} /> : localities.length ? <div className="location-directory">{localities.map((item: Location, index) => <Link key={item.slug} href={`/clinics?city=${encodeURIComponent(cityFor(item))}&location=${item.slug}`} className="location-row" data-testid={`link-location-${item.slug}`}><span className="location-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.city}</strong><small>{cityFor(item)} · {item.state}</small></span><span className="location-count">{item.clinicCount} {item.clinicCount === 1 ? 'clinic' : 'clinics'}</span><ArrowRight size={18} /></Link>)}</div> : <EmptyBlock title="No locations found in this city." body="Choose another city to continue browsing." />}</div></Shell>;
}

function Glossary() {
  return <Shell><PageIntro eyebrow="The OpenIVF guide" title="Behind the Rates." description="What success means, how it is calculated, and what a percentage can leave out." /><SuccessRateGuide /></Shell>;
}

function About() {
  return <Shell>
    <PageIntro eyebrow="Behind the directory" title="Clarity for a deeply personal decision." description="OpenIVF exists to make IVF clinic information in India easier to understand—starting with the meaning behind success rates." />
    <div className="shell-inner about-story">
      <article>
        <section className="about-mission">
          <Eyebrow>Our mission</Eyebrow>
          <h2>Every success rate deserves an explanation.</h2>
          <p>We want people exploring IVF to understand what a clinic’s reported number actually says: what counts as success, who was counted, and where the information came from.</p>
          <p>Our aim is to make that context easy to find, so people can ask better questions and make more informed decisions.</p>
        </section>
        <section>
          <Eyebrow>Why we are building this</Eyebrow>
          <h2>The number is only the beginning.</h2>
          <p>A headline percentage can look straightforward. But a positive pregnancy test, a clinical pregnancy and a live birth describe different outcomes. Counting from embryo transfer also answers a different question from counting every cycle that started.</p>
          <p>When those details are missing, it is difficult to know what a claim means or whether two clinics are describing the same thing. OpenIVF brings the claim and its explanation together.</p>
          <Link href="/glossary" className="text-link">Go behind the rates <ArrowRight size={16} /></Link>
        </section>
        <section>
          <Eyebrow>What we are working toward</Eyebrow>
          <h2>A more transparent starting point.</h2>
          <div className="about-promises">
            <div><span>01</span><div><h3>Find clinics across India</h3><p>A directory that helps people explore clinics by city and locality.</p></div></div>
            <div><span>02</span><div><h3>Understand reported results</h3><p>Success rates accompanied by their definitions, patient context, reporting period and source wherever available.</p></div></div>
            <div><span>03</span><div><h3>Make missing information visible</h3><p>Clear distinctions between what a clinic reports, what the source supports and what still needs clarification.</p></div></div>
          </div>
        </section>
      </article>
      <aside className="about-builder">
        <Eyebrow>The person behind OpenIVF</Eyebrow>
        <h2>Pulkit Goyal</h2>
        <p className="about-builder-role">Building OpenIVF</p>
        <p>I’m building this directory to make IVF success-rate claims more transparent. I want people to be able to see a clinic’s reported rate, understand how it defines success, and follow the source behind the claim.</p>
        <p>The intent is simple: make the information clearer and the questions easier to ask.</p>
        <div className="about-builder-note"><strong>Built around transparency</strong><p>OpenIVF explains published information. Listing a clinic is not an endorsement, and reviewing a source is not an independent audit of its records.</p></div>
      </aside>
    </div>
    <section className="shell-inner about-next">
      <div><Eyebrow>Help make the directory useful</Eyebrow><h2>Better information starts with a source.</h2><p>If a record is incomplete or out of date, share a correction and a supporting source.</p></div>
      <Link href="/corrections" className="btn btn-outline">Suggest a correction <ArrowRight size={16} /></Link>
    </section>
  </Shell>;
}

function Corrections() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const [form, setForm] = useState({ clinicSlug: params.get('clinic') || '', observationId: '', message: '', contactEmail: '' });
  const [done, setDone] = useState(false);
  const submitCorrection = useSubmitCorrection();
  const submit = (event: React.FormEvent) => { event.preventDefault(); submitCorrection.mutate({ data: { ...form, observationId: form.observationId || null } }, { onSuccess: () => setDone(true) }); };
  return <Shell><PageIntro eyebrow="Keep the record useful" title="Notice something that needs correcting?" description="Tell us what looks out of date or inaccurate. Specific, sourced notes help us review changes carefully." /><div className="shell-inner form-layout">{done ? <div className="success-panel"><div className="success-icon"><Check size={22} /></div><Eyebrow>Correction received</Eyebrow><h2>Thank you for helping keep the record clear.</h2><p>Your note has been logged for review. We will use the contact details only if we need to clarify the report.</p><Link href="/clinics" className="btn btn-primary" data-testid="link-correction-directory">Return to directory <ArrowRight size={17} /></Link></div> : <form className="public-form" onSubmit={submit}><label className="field-label">Clinic slug<input required value={form.clinicSlug} onChange={e => setForm({ ...form, clinicSlug: e.target.value })} placeholder="For example, lotus-fertility-delhi" data-testid="input-correction-clinic" /></label><label className="field-label">Observation ID <span className="optional">optional</span><input value={form.observationId} onChange={e => setForm({ ...form, observationId: e.target.value })} placeholder="If your note concerns a specific rate" data-testid="input-correction-observation" /></label><label className="field-label">What should we review?<textarea required minLength={10} maxLength={5000} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Describe the issue and include a source link if you have one." data-testid="textarea-correction-message" /></label><label className="field-label">Your email<input required type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="you@example.com" data-testid="input-correction-email" /></label><Button type="submit" className="submit-button" disabled={submitCorrection.isPending} data-testid="button-submit-correction">{submitCorrection.isPending ? 'Sending…' : 'Send correction'} <ArrowRight size={17} /></Button>{submitCorrection.isError && <p className="form-error">We could not send that just now. Please try again.</p>}<p className="form-footnote">Please do not include medical records or sensitive personal health information.</p></form>}<aside className="form-aside"><div className="aside-note"><ClipboardCheck size={18} /><p><strong>What helps most</strong> The clinic name, the field that needs review, a clear explanation, and a public source or date.</p></div><Link href="/glossary" className="text-link" data-testid="link-correction-methodology">Understand success rates <ArrowRight size={15} /></Link></aside></div></Shell>;
}

function Privacy() {
  return <Shell><PageIntro eyebrow="Privacy principles" title="Less data, more care." description="The directory should be useful without asking for more than it needs." /><div className="shell-inner legal-copy"><h2>Our approach</h2><p>This demonstration interface is designed around data minimisation. Public browsing does not require an account. We do not ask for health information to search clinics.</p><h2>Correction messages</h2><p>If you submit a correction, we receive the clinic reference, your message and contact email. We use these details to review the note and follow up when needed. Please do not include medical records or sensitive personal health information.</p><h2>Cookies and analytics</h2><p>This prototype does not describe a commercial advertising profile. Any operational logging should be limited to keeping the service secure and functioning.</p><h2>Questions</h2><p>For a privacy question about this demonstration, use the correction channel and identify it as a privacy question.</p></div></Shell>;
}

function Terms() {
  return <Shell><PageIntro eyebrow="Terms" title="Use the directory thoughtfully." description="A few plain-language boundaries for using this public reference." /><div className="shell-inner legal-copy"><h2>Information only</h2><p>OpenIVF provides general information for research and orientation. It is not medical advice, diagnosis, treatment, referral, or a guarantee of outcomes.</p><h2>Sources and demonstration records</h2><p>Records are presented with their sources and review dates where available. Some records are fictional demonstration data. You are responsible for checking details with the clinic and a qualified clinician before making decisions.</p><h2>Respectful corrections</h2><p>Use the correction form for specific, good-faith reports. Do not submit private health information, abusive content or unrelated marketing.</p><h2>Availability</h2><p>We may change, pause or remove parts of the directory as the project develops. A clinic’s inclusion is not an endorsement.</p></div></Shell>;
}

function Admin() { return <AdminGate><AdminDesk /></AdminGate>; }

function AdminDesk() {
  const qc = useQueryClient();
  const summary = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey() } });
  const clinics = useListAdminClinics({ query: { queryKey: getListAdminClinicsQueryKey() } });
  const services = useListServices({ query: { queryKey: getListServicesQueryKey() } });
  const sources = useListSources({ query: { queryKey: getListSourcesQueryKey() } });
  const observations = useListRateObservations({ query: { queryKey: getListRateObservationsQueryKey() } });
  const audits = useListAuditEvents({ query: { queryKey: getListAuditEventsQueryKey() } });
  const createClinic = useCreateClinic();
  const updateClinic = useUpdateClinic();
  const archiveClinic = useArchiveClinic();
  const createService = useCreateService();
  const createSource = useCreateSource();
  const createObservation = useCreateRateObservation();
  const publishObservation = usePublishRateObservation();
  const unpublishObservation = useUnpublishRateObservation();
  const previewImport = usePreviewImport();
  const [tab, setTab] = useState('overview');
  const [showClinicForm, setShowClinicForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [clinicForm, setClinicForm] = useState({ name: '', slug: '', city: '', state: '', address: '', regulator: '', licensingStatus: '', phone: '', email: '', website: '' });
  const [serviceName, setServiceName] = useState('');
  const [sourceForm, setSourceForm] = useState({ title: '', sourceType: 'Registry', url: '', publisher: '', publishedOn: '', notes: '' });
  const [csvText, setCsvText] = useState('');
  const saveClinic = (event: React.FormEvent) => { event.preventDefault(); const data = { ...clinicForm, address: clinicForm.address || null, regulator: clinicForm.regulator || null, licensingStatus: clinicForm.licensingStatus || null, phone: clinicForm.phone || null, email: clinicForm.email || null, website: clinicForm.website || null }; const onSuccess = () => { setShowClinicForm(false); setEditing(null); qc.invalidateQueries({ queryKey: getListAdminClinicsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }); }; editing ? updateClinic.mutate({ id: editing.id, data }, { onSuccess }) : createClinic.mutate({ data }, { onSuccess }); };
  const addService = () => { if (!serviceName.trim()) return; createService.mutate({ data: { name: serviceName, slug: serviceName.toLowerCase().trim().replaceAll(/\s+/g, '-'), description: null } }, { onSuccess: () => { setServiceName(''); qc.invalidateQueries({ queryKey: getListServicesQueryKey() }); } }); };
  const addSource = (event: React.FormEvent) => { event.preventDefault(); createSource.mutate({ data: { ...sourceForm, publisher: sourceForm.publisher || null, publishedOn: sourceForm.publishedOn || null, notes: sourceForm.notes || null } }, { onSuccess: () => { setSourceForm({ title: '', sourceType: 'Registry', url: '', publisher: '', publishedOn: '', notes: '' }); qc.invalidateQueries({ queryKey: getListSourcesQueryKey() }); } }); };
  const isBusy = summary.isLoading || clinics.isLoading;
  return <Shell><div className="admin-shell"><div className="shell-inner admin-head"><div><Eyebrow>Protected workspace</Eyebrow><h1>Directory desk</h1><p>Review records, publish carefully, keep an audit trail.</p></div><div className="admin-lock"><ShieldCheck size={17} />Editor surface</div></div><div className="shell-inner admin-tabs" role="tablist">{['overview', 'clinics', 'observations', 'sources', 'import', 'audit'].map(item => <button key={item} onClick={() => setTab(item)} className={tab === item ? 'active' : ''} role="tab" data-testid={`tab-admin-${item}`}>{item}</button>)}</div><div className="shell-inner admin-content">{isBusy ? <LoadingBlock lines={5} /> : summary.isError ? <div className="state-card"><p className="eyebrow">Workspace unavailable</p><h2>We could not load the editor workspace.</h2><p>Try refreshing the page or signing in again. If this continues, check that the backend has been deployed.</p><Link href="/about" className="text-link">Read the project scope <ArrowRight size={15} /></Link></div> : tab === 'overview' ? <><div className="metric-grid"><div><span>Clinic records</span><strong>{summary.data?.clinicCount ?? 0}</strong><small>All statuses</small></div><div><span>Published observations</span><strong>{summary.data?.publishedObservationCount ?? 0}</strong><small>Visible publicly</small></div><div><span>Draft observations</span><strong>{summary.data?.draftObservationCount ?? 0}</strong><small>Awaiting review</small></div><div><span>Corrections pending</span><strong>{summary.data?.pendingCorrectionCount ?? 0}</strong><small>Need attention</small></div></div><section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Recent activity</Eyebrow><h2>Audit trail</h2></div><button className="text-link-button" onClick={() => setTab('audit')} data-testid="button-view-audit">View all <ArrowRight size={15} /></button></div>{summary.data?.recentAuditEvents?.length ? summary.data.recentAuditEvents.slice(0, 6).map(event => <div className="audit-row" key={event.id}><span className="audit-action">{event.action}</span><span>{event.entityType} · {event.entityId}</span><time>{new Date(event.createdAt).toLocaleDateString('en-IN')}</time></div>) : <EmptyBlock title="No recent activity." body="Changes will appear here as records move through review." />}</section></> : tab === 'clinics' ? <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Records workflow</Eyebrow><h2>Clinics</h2></div><Button onClick={() => { setEditing(null); setClinicForm({ name: '', slug: '', city: '', state: '', address: '', regulator: '', licensingStatus: '', phone: '', email: '', website: '' }); setShowClinicForm(true); }} data-testid="button-add-clinic"><Plus size={16} /> Add clinic</Button></div>{showClinicForm && <form className="admin-form" onSubmit={saveClinic}><div className="form-grid">{(['name', 'slug', 'city', 'state', 'address', 'regulator', 'licensingStatus', 'phone', 'email', 'website'] as const).map(field => <label className="field-label" key={field}>{field}<input required={['name', 'slug', 'city', 'state'].includes(field)} value={clinicForm[field]} onChange={e => setClinicForm({ ...clinicForm, [field]: e.target.value })} data-testid={`input-admin-clinic-${field}`} /></label>)}</div><div className="form-actions"><Button type="submit" disabled={createClinic.isPending || updateClinic.isPending} data-testid="button-save-clinic">{editing ? 'Save changes' : 'Create draft'}</Button><Button type="button" variant="quiet" onClick={() => setShowClinicForm(false)} data-testid="button-cancel-clinic">Cancel</Button></div></form>}{clinics.data?.map((clinic: any) => <div className="admin-record-row" key={clinic.id}><div><strong>{clinic.name}</strong><span>{clinic.city}, {clinic.state} · {clinic.recordStatus}</span></div><div className="row-actions"><button className="icon-text-button" onClick={() => { setEditing(clinic); setClinicForm({ name: clinic.name, slug: clinic.slug, city: clinic.city, state: clinic.state, address: clinic.address || '', regulator: clinic.regulator || '', licensingStatus: clinic.licensingStatus || '', phone: clinic.phone || '', email: clinic.email || '', website: clinic.website || '' }); setShowClinicForm(true); }} data-testid={`button-edit-clinic-${clinic.id}`}>Edit</button><button className="icon-text-button danger-text" onClick={() => { if (window.confirm('Archive this clinic record?')) archiveClinic.mutate({ id: clinic.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAdminClinicsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }); } }); }} data-testid={`button-archive-clinic-${clinic.id}`}>Archive</button></div></div>)}</section> : tab === 'observations' ? <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Rate records</Eyebrow><h2>Observation queue</h2></div><span className="panel-count">{observations.data?.length || 0} records</span></div>{observations.data?.map((observation: RateObservation) => <div className="admin-record-row" key={observation.id}><div><strong>{observation.outcomeType} · {observation.yearLabel}</strong><span>{observation.outcomeDefinition} · {observation.publicationStatus}</span></div><div className="row-actions">{observation.publicationStatus === 'published' ? <button className="icon-text-button" onClick={() => unpublishObservation.mutate({ id: observation.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListRateObservationsQueryKey() }) })} data-testid={`button-unpublish-${observation.id}`}>Unpublish</button> : <button className="icon-text-button" onClick={() => publishObservation.mutate({ id: observation.id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListRateObservationsQueryKey() }); qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() }); } })} data-testid={`button-publish-${observation.id}`}>Publish</button>}</div></div>)}</section> : tab === 'sources' ? <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Evidence library</Eyebrow><h2>Sources and services</h2></div></div><form className="admin-form" onSubmit={addSource}><div className="form-grid">{(['title', 'sourceType', 'url', 'publisher', 'publishedOn'] as const).map(field => <label className="field-label" key={field}>{field}<input required={['title', 'sourceType', 'url'].includes(field)} value={sourceForm[field]} onChange={e => setSourceForm({ ...sourceForm, [field]: e.target.value })} data-testid={`input-admin-source-${field}`} /></label>)}</div><label className="field-label">notes<textarea value={sourceForm.notes} onChange={e => setSourceForm({ ...sourceForm, notes: e.target.value })} data-testid="textarea-admin-source-notes" /></label><Button type="submit" disabled={createSource.isPending} data-testid="button-create-source"><Plus size={16} /> Add source</Button></form><div className="admin-subsection"><p className="eyebrow">Services</p><div className="service-add"><input value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="New service name" data-testid="input-admin-service-name" /><Button onClick={addService} disabled={createService.isPending} data-testid="button-create-service">Add</Button></div>{services.data?.map((service: Service) => <div className="small-record" key={service.id}><span>{service.name}</span><code>{service.slug}</code></div>)}</div><div className="admin-subsection"><p className="eyebrow">Sources</p>{sources.data?.map((source: any) => <div className="small-record" key={source.id}><span>{source.title}</span><code>{source.sourceType}</code></div>)}</div></section> : tab === 'import' ? <ImportPanel csvText={csvText} setCsvText={setCsvText} previewImport={previewImport} /> : <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Immutable history</Eyebrow><h2>Audit events</h2></div></div>{audits.data?.map(event => <div className="audit-row" key={event.id}><span className="audit-action">{event.action}</span><span>{event.entityType} · {event.entityId}</span><time>{new Date(event.createdAt).toLocaleString('en-IN')}</time></div>)}</section>}</div></div></Shell>;
}

function ImportPanel({ csvText, setCsvText, previewImport }: { csvText: string; setCsvText: (value: string) => void; previewImport: ReturnType<typeof usePreviewImport> }) {
  const [preview, setPreview] = useState<any>(null);
  const runPreview = () => previewImport.mutate({ data: { csvText, mapping: {} } }, { onSuccess: setPreview });
  return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Validation only</Eyebrow><h2>Preview a CSV import</h2></div></div><p className="panel-copy">Paste CSV text to validate rows before anything is written. This step does not create records.</p><textarea className="csv-input" value={csvText} onChange={e => setCsvText(e.target.value)} placeholder="clinic_name,city,state&#10;Example Clinic,Delhi,Delhi" data-testid="textarea-import-csv" /><Button onClick={runPreview} disabled={!csvText.trim() || previewImport.isPending} data-testid="button-preview-import">{previewImport.isPending ? 'Checking…' : 'Check rows'} <ArrowRight size={16} /></Button>{preview && <div className="import-result"><div><strong>{preview.validRows}</strong><span>valid rows</span></div><div><strong>{preview.invalidRows}</strong><span>invalid rows</span></div><div><strong>{preview.duplicateRows}</strong><span>duplicates</span></div>{preview.errors?.length > 0 && <div className="import-errors">{preview.errors.map((error: any) => <p key={`${error.rowNumber}-${error.field}`}>Row {error.rowNumber} · {error.field}: {error.message}</p>)}</div>}</div>}</section>;
}

function AppRouter() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location]);
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Home} /><Route path="/clinics" component={Clinics} /><Route path="/clinics/:slug" component={ClinicProfilePage} /><Route path="/locations" component={Locations} /><Route path="/glossary" component={Glossary} /><Route path="/about" component={About} /><Route path="/privacy" component={Privacy} /><Route path="/terms" component={Terms} /><Route path="/corrections" component={Corrections} /><Route path="/admin" component={Admin} /><Route path="/not-found" component={NotFound} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRouter /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
