import type {
  Clinic,
  ClinicListResponse,
  ClinicProfile,
  ListClinicsParams,
  Location,
  RateObservation,
  Service,
} from '@workspace/api-client-react';

type FirebaseConfig = { apiKey: string; projectId: string };
type RestValue = Record<string, any>;
type Filter = { field: string; value: string };
type RawClinic = Clinic & { serviceIds: string[] };

let configRequest: Promise<FirebaseConfig> | undefined;

async function firebaseConfig(): Promise<FirebaseConfig> {
  return configRequest ??= fetch('/__/firebase/init.json').then(async response => {
    if (!response.ok) throw new Error('Firebase is not configured.');
    return response.json();
  });
}

function decodeValue(value: RestValue): any {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return undefined;
}

function decodeFields(fields: Record<string, RestValue>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

async function list<T>(collectionId: string, filters: Filter[] = []): Promise<T[]> {
  const config = await firebaseConfig();
  const fieldFilters = filters.map(filter => ({
    fieldFilter: {
      field: { fieldPath: filter.field },
      op: 'EQUAL',
      value: { stringValue: filter.value },
    },
  }));
  const where = fieldFilters.length === 1
    ? fieldFilters[0]
    : fieldFilters.length > 1
      ? { compositeFilter: { op: 'AND', filters: fieldFilters } }
      : undefined;
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          ...(where ? { where } : {}),
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`Could not load ${collectionId}.`);
  const rows = await response.json();
  return rows
    .filter((row: any) => row.document)
    .map((row: any) => decodeFields(row.document.fields ?? {}));
}

function locations(clinics: Clinic[]): Location[] {
  const result = new Map<string, Location>();
  for (const clinic of clinics) {
    const slug = `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, '-');
    const location = result.get(slug) ?? {
      slug,
      city: clinic.city,
      state: clinic.state,
      clinicCount: 0,
    };
    location.clinicCount++;
    result.set(slug, location);
  }
  return [...result.values()];
}

async function publishedClinics(): Promise<ClinicProfile[]> {
  const [clinics, services] = await Promise.all([
    list<RawClinic>('clinics', [{ field: 'recordStatus', value: 'published' }]),
    list<Service>('services'),
  ]);
  return Promise.all(
    clinics.sort((a, b) => a.name.localeCompare(b.name)).map(async raw => {
      const observations = await list<RateObservation>('rate_observations', [
        { field: 'clinicId', value: raw.id },
        { field: 'publicationStatus', value: 'published' },
      ]);
      observations.sort((a, b) => a.reportingPeriodEnd.localeCompare(b.reportingPeriodEnd));
      const clinicServices: Service[] = services.filter(service =>
        (raw.serviceIds ?? []).includes(service.id),
      );
      return {
        ...raw,
        services: clinicServices,
        observations,
        headlineObservation: observations.at(-1) ?? null,
      } as ClinicProfile;
    }),
  );
}

export const publicDirectoryStore = {
  async listClinics(filters: ListClinicsParams = {}): Promise<ClinicListResponse> {
    const clinics = await publishedClinics();
    const matches = clinics.filter(clinic => {
      if (filters.q && ![clinic.name, clinic.city, clinic.state].join(' ').toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
      if (filters.location && !clinic.city.toLowerCase().includes(filters.location.toLowerCase()) && `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, '-') !== filters.location.toLowerCase()) return false;
      if (filters.service && !clinic.services.some(service => service.slug === filters.service || service.name.toLowerCase() === filters.service?.toLowerCase())) return false;
      const fields = ['ageBand', 'outcomeType', 'denominatorType', 'eggSource'] as const;
      const hasObservationFilters = fields.some(key => filters[key] != null) || filters.reportingYear != null || filters.verificationType != null;
      return !hasObservationFilters || clinic.observations.some(observation =>
        fields.every(key => filters[key] == null || filters[key] === observation[key]) &&
        (filters.reportingYear == null || Number(observation.yearLabel) === filters.reportingYear) &&
        (filters.verificationType == null || observation.verificationStatus === filters.verificationType),
      );
    });
    return {
      items: matches,
      total: matches.length,
      availableLocations: locations(clinics),
      availableServices: [...new Map(clinics.flatMap(clinic => clinic.services).map(service => [service.id, service])).values()],
    };
  },

  async getClinic(slug: string): Promise<ClinicProfile> {
    const clinic = (await publishedClinics()).find(item => item.slug === slug);
    if (!clinic) throw new Error('Clinic not found.');
    return clinic;
  },

  async listLocations(): Promise<Location[]> {
    return locations(await list<Clinic>('clinics', [{ field: 'recordStatus', value: 'published' }]));
  },
};
