import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, runTransaction, serverTimestamp, setDoc, getCountFromServer, type Firestore, type DocumentData } from 'firebase/firestore';
import type { Clinic, AdminClinic, ClinicProfile, Service, Source, RateObservation, ClinicInput, ClinicUpdate, ServiceInput, SourceInput, RateObservationInput, CorrectionInput, CorrectionReceipt, ClinicListResponse, ListClinicsParams, Location, AdminSummary, AuditEvent, ImportPreview, ImportPreviewInput } from '@workspace/api-client-react';

type Entity = 'clinics' | 'services' | 'sources' | 'rate_observations';
export function decode(value: any): any {
  if (value?.toDate) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  return value;
}
export async function uniqueKey(entity: string, value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return entity + '_' + Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
const uniqueField = (entity: Entity) => entity === 'sources' ? 'url' : entity === 'rate_observations' ? undefined : 'slug';
function sourceSnapshot(source: DocumentData): Source {
  return { id: source.id, title: source.title, sourceType: source.sourceType, url: source.url, publisher: source.publisher ?? null, publishedOn: source.publishedOn ?? null, notes: source.notes ?? null };
}
function defaults(entity: Entity): DocumentData {
  if (entity === 'clinics') return { address: null, latitude: null, longitude: null, licensingStatus: null, regulator: null, phone: null, email: null, website: null, googleRating: null, googleReviewCount: null, dataSource: null, dataRetrievedAt: null, recordStatus: 'draft', lastReviewedAt: new Date().toISOString().slice(0, 10), demonstrationData: false, serviceIds: [] };
  if (entity === 'services') return { description: null };
  if (entity === 'sources') return { publisher: null, publishedOn: null, notes: null };
  return { numerator: null, denominatorCount: null, ageMeasurementPoint: null, priorTreatmentCohort: null, supersedesId: null, smallSample: false, verificationStatus: 'unverified', publicationStatus: 'draft' };
}
export function comparabilityKey(input: DocumentData, jurisdiction: string) {
  return [input.outcomeDefinition, input.denominatorDefinition, input.ageBand, input.ageMeasurementPoint ?? 'unspecified', input.eggSource, input.treatmentContext, input.treatmentType, input.cumulativeMethod, input.priorTreatmentCohort ?? 'unspecified', jurisdiction, 'v1'].map(value => String(value).trim().toLowerCase().replace(/\s+/g, '-')).join('|');
}

// The browser is untrusted. All invariants below are independently enforced by firestore.rules.
export function createDirectoryStore(db: Firestore, uid: () => string | undefined) {
  async function list(name: string, constraints: Parameters<typeof query>[1][] = []) {
    return (await getDocs(query(collection(db, name), ...constraints))).docs.map(item => decode({ ...item.data(), id: item.id }));
  }
  async function save(entity: Entity, input: DocumentData, id?: string) {
    const actor = uid();
    if (!actor) throw new Error('Sign in to edit records.');
    const ref = doc(db, entity, id ?? crypto.randomUUID());
    const auditRef = doc(collection(db, 'audit_events'));
    await runTransaction(db, async tx => {
      const current = await tx.get(ref);
      if (id && !current.exists()) throw new Error('Record not found.');
      const before = current.exists() ? current.data() : null;
      const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
      const after: DocumentData = { ...(before ?? { ...defaults(entity), createdAt: serverTimestamp() }), ...data, id: ref.id, updatedAt: serverTimestamp(), auditId: auditRef.id };
      if (entity === 'rate_observations') {
        const [clinic, source] = await Promise.all([tx.get(doc(db, 'clinics', after.clinicId)), tx.get(doc(db, 'sources', after.sourceId))]);
        if (!clinic.exists() || !source.exists()) throw new Error('Clinic and source must exist.');
        after.source = sourceSnapshot(source.data());
        after.ratePercentage = Number(after.ratePercentage);
        after.comparabilityGroupKey = comparabilityKey(after, clinic.data().state);
      }
      const field = uniqueField(entity);
      let reservation;
      if (field) {
        reservation = doc(db, 'unique_keys', await uniqueKey(entity, after[field]));
        const existing = await tx.get(reservation);
        if (existing.exists() && existing.data().entityId !== ref.id) throw new Error(`This ${field} already exists.`);
      }
      // All transaction reads precede the first write.
      if (field && reservation) {
        if (before && before[field] !== after[field]) tx.delete(doc(db, 'unique_keys', await uniqueKey(entity, before[field])));
        tx.set(reservation, { entityType: entity, entityId: ref.id, value: after[field] });
      }
      tx.set(ref, after);
      tx.set(auditRef, { id: auditRef.id, actorUserId: actor, action: before ? 'update' : 'create', entityType: entity, entityId: ref.id, beforeSnapshot: before, afterSnapshot: after, createdAt: serverTimestamp() });
    });
    return decode((await getDoc(ref)).data());
  }
  async function services(): Promise<Service[]> { return list('services', [orderBy('name')]); }
  async function adminClinic(raw: DocumentData, catalog?: Service[]): Promise<AdminClinic> {
    const allServices = catalog ?? await services();
    return { ...raw, services: allServices.filter(service => (raw.serviceIds ?? []).includes(service.id)), headlineObservation: null } as AdminClinic;
  }
  async function publishedClinics(): Promise<ClinicProfile[]> {
    const [clinics, catalog] = await Promise.all([list('clinics', [where('recordStatus', '==', 'published')]), services()]);
    // A per-clinic query lets the rules check the parent status even after archival.
    return Promise.all(clinics.sort((a, b) => a.name.localeCompare(b.name)).map(async raw => {
      const observations: RateObservation[] = (await list('rate_observations', [where('clinicId', '==', raw.id), where('publicationStatus', '==', 'published')])).sort((a, b) => a.reportingPeriodEnd.localeCompare(b.reportingPeriodEnd));
      const clinic = await adminClinic(raw, catalog);
      return { ...clinic, observations, headlineObservation: observations.at(-1) ?? null };
    }));
  }
  function locations(clinics: Clinic[]): Location[] {
    const result = new Map<string, Location>();
    for (const clinic of clinics) {
      const slug = `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, '-');
      const location = result.get(slug) ?? { slug, city: clinic.city, state: clinic.state, clinicCount: 0 };
      location.clinicCount++; result.set(slug, location);
    }
    return [...result.values()];
  }
  return {
    async listClinics(filters: ListClinicsParams = {}): Promise<ClinicListResponse> {
      const clinics = await publishedClinics();
      const matches = clinics.filter(clinic => {
        if (filters.q && ![clinic.name, clinic.city, clinic.state].join(' ').toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
        if (filters.location && !clinic.city.toLowerCase().includes(filters.location.toLowerCase()) && `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, '-') !== filters.location.toLowerCase()) return false;
        if (filters.service && !clinic.services.some(service => service.slug === filters.service || service.name.toLowerCase() === filters.service?.toLowerCase())) return false;
        const fields = ['ageBand', 'outcomeType', 'denominatorType', 'eggSource'] as const;
        const hasFilters = fields.some(key => filters[key] != null) || filters.reportingYear != null || filters.verificationType != null;
        return !hasFilters || clinic.observations.some(observation => fields.every(key => filters[key] == null || filters[key] === observation[key]) && (filters.reportingYear == null || Number(observation.yearLabel) === filters.reportingYear) && (filters.verificationType == null || observation.verificationStatus === filters.verificationType));
      });
      return { items: matches, total: matches.length, availableLocations: locations(clinics), availableServices: [...new Map(clinics.flatMap(clinic => clinic.services).map(service => [service.id, service])).values()] };
    },
    async getClinic(slug: string): Promise<ClinicProfile> {
      const [raw] = await list('clinics', [where('recordStatus', '==', 'published'), where('slug', '==', slug), limit(1)]);
      if (!raw) throw new Error('Clinic not found.');
      const observations: RateObservation[] = (await list('rate_observations', [where('clinicId', '==', raw.id), where('publicationStatus', '==', 'published')])).sort((a, b) => a.reportingPeriodEnd.localeCompare(b.reportingPeriodEnd));
      return { ...await adminClinic(raw), observations, headlineObservation: observations.at(-1) ?? null };
    },
    async listLocations() { return locations(await list('clinics', [where('recordStatus', '==', 'published')])); },
    async listAdminClinics(): Promise<AdminClinic[]> { const [clinics, catalog] = await Promise.all([list('clinics', [orderBy('name')]), services()]); return Promise.all(clinics.map(clinic => adminClinic(clinic, catalog))); },
    async createClinic(input: ClinicInput) { return adminClinic(await save('clinics', { ...input, recordStatus: 'draft' })); },
    async updateClinic(id: string, input: ClinicUpdate) { return adminClinic(await save('clinics', input, id)); },
    async archiveClinic(id: string) { await save('clinics', { recordStatus: 'archived' }, id); },
    async publishClinic(id: string) { return adminClinic(await save('clinics', { recordStatus: 'published' }, id)); },
    listServices: services,
    async createService(input: ServiceInput): Promise<Service> { return save('services', input); },
    async listSources(): Promise<Source[]> { return list('sources', [orderBy('title')]); },
    async createSource(input: SourceInput): Promise<Source> { return save('sources', input); },
    async listRateObservations(): Promise<RateObservation[]> { return list('rate_observations', [orderBy('reportingPeriodEnd')]); },
    async createRateObservation(input: RateObservationInput): Promise<RateObservation> { return save('rate_observations', { ...input, publicationStatus: 'draft' }); },
    async publishRateObservation(id: string): Promise<RateObservation> { return save('rate_observations', { publicationStatus: 'published' }, id); },
    async unpublishRateObservation(id: string): Promise<RateObservation> { return save('rate_observations', { publicationStatus: 'archived' }, id); },
    async listAuditEvents(): Promise<AuditEvent[]> { return list('audit_events', [orderBy('createdAt', 'desc'), limit(100)]); },
    async getAdminSummary(): Promise<AdminSummary> {
      const count = async (name: string, field?: string, value?: string) => (await getCountFromServer(query(collection(db, name), ...(field ? [where(field, '==', value)] : [])))).data().count;
      const [clinicCount, publishedObservationCount, draftObservationCount, pendingCorrectionCount, recentAuditEvents] = await Promise.all([count('clinics'), count('rate_observations', 'publicationStatus', 'published'), count('rate_observations', 'publicationStatus', 'draft'), count('correction_submissions', 'status', 'pending'), list('audit_events', [orderBy('createdAt', 'desc'), limit(8)])]);
      return { clinicCount, publishedObservationCount, draftObservationCount, pendingCorrectionCount, recentAuditEvents };
    },
    async submitCorrection(input: CorrectionInput): Promise<CorrectionReceipt> {
      const ref = doc(collection(db, 'correction_submissions'));
      await setDoc(ref, { ...input, observationId: input.observationId ?? null, id: ref.id, status: 'pending', createdAt: serverTimestamp() });
      // Receipt does not require permission to read submissions back.
      return { id: ref.id, receivedAt: new Date().toISOString() };
    },
  };
}

export async function previewImport(input: ImportPreviewInput): Promise<ImportPreview> {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < input.csvText.length; i++) {
    const char = input.csvText[i];
    if (char === '"') { if (quoted && input.csvText[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if (char === '\n' && !quoted) { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell.trim()]);
  const headers = rows.shift() ?? []; const errors: ImportPreview['errors'] = [];
  if (quoted) errors.push({ rowNumber: 1, field: 'csvText', message: 'Unclosed quoted field.' });
  const required = ['name', 'city', 'state'];
  const indexes = required.map(field => headers.indexOf(input.mapping[field] ?? (field === 'name' && headers.includes('clinic_name') ? 'clinic_name' : field)));
  indexes.forEach((index, i) => { if (index < 0) errors.push({ rowNumber: 1, field: required[i], message: 'Required column is missing.' }); });
  const seen = new Set<string>(); let duplicateRows = 0; let validRows = 0;
  rows.forEach((row, i) => {
    const key = indexes.map(index => row[index]?.toLowerCase()).join('|');
    if (indexes.some(index => index < 0 || !row[index]) || row.length !== headers.length || quoted) errors.push({ rowNumber: i + 2, field: 'row', message: 'Provide a name, city and state, and match the header columns.' });
    else if (seen.has(key)) duplicateRows++;
    else validRows++;
    seen.add(key);
  });
  return { totalRows: rows.length, validRows, duplicateRows, invalidRows: rows.length - validRows - duplicateRows, errors };
}
