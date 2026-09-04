import { and, asc, eq, inArray } from "drizzle-orm";
import {
  clinicServicesTable,
  clinicsTable,
  db,
  rateObservationsTable,
  servicesTable,
  sourcesTable,
} from "@workspace/db";
import type { Clinic, RateObservation, Service, Source } from "@workspace/db";

export const DEMO_SOURCE_URL = "https://example.invalid/ivf-methodology-demo";

type ClinicWithDetails = Clinic & {
  services: Service[];
  observations: RateObservation[];
};

export function comparabilityKey(input: {
  outcomeDefinition: string;
  denominatorDefinition: string;
  ageBand: string;
  ageMeasurementPoint?: string | null;
  eggSource: string;
  treatmentContext: string;
  treatmentType: string;
  cumulativeMethod: string;
  priorTreatmentCohort?: string | null;
  jurisdiction: string;
  methodologyVersion?: string;
}): string {
  return [
    input.outcomeDefinition,
    input.denominatorDefinition,
    input.ageBand,
    input.ageMeasurementPoint ?? "unspecified",
    input.eggSource,
    input.treatmentContext,
    input.treatmentType,
    input.cumulativeMethod,
    input.priorTreatmentCohort ?? "unspecified",
    input.jurisdiction,
    input.methodologyVersion ?? "v1",
  ]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, "-"))
    .join("|");
}

export function serializeSource(source: Source): Source {
  return source;
}

export function serializeObservation(
  observation: RateObservation,
  source: Source,
): Omit<RateObservation, "ratePercentage"> & {
  ratePercentage: number;
  source: Source;
} {
  return {
    ...observation,
    ratePercentage: Number(observation.ratePercentage),
    source: serializeSource(source),
  };
}

export async function loadPublishedClinics(): Promise<ClinicWithDetails[]> {
  const clinics = await db
    .select()
    .from(clinicsTable)
    .where(eq(clinicsTable.recordStatus, "published"))
    .orderBy(asc(clinicsTable.name));

  if (clinics.length === 0) return [];

  const clinicIds = clinics.map((clinic) => clinic.id);
  const serviceLinks = await db
    .select({
      clinicId: clinicServicesTable.clinicId,
      service: servicesTable,
    })
    .from(clinicServicesTable)
    .innerJoin(servicesTable, eq(servicesTable.id, clinicServicesTable.serviceId))
    .where(inArray(clinicServicesTable.clinicId, clinicIds));
  const observations = await db
    .select()
    .from(rateObservationsTable)
    .where(
      and(
        inArray(rateObservationsTable.clinicId, clinicIds),
        eq(rateObservationsTable.publicationStatus, "published"),
      ),
    )
    .orderBy(asc(rateObservationsTable.reportingPeriodEnd));

  const byClinic = new Map<string, ClinicWithDetails>();
  for (const clinic of clinics) {
    byClinic.set(clinic.id, { ...clinic, services: [], observations: [] });
  }
  for (const link of serviceLinks) {
    byClinic.get(link.clinicId)?.services.push(link.service);
  }
  for (const observation of observations) {
    byClinic.get(observation.clinicId)?.observations.push(observation);
  }
  return [...byClinic.values()];
}

export async function loadSources(
  ids: string[],
): Promise<Map<string, Source>> {
  if (ids.length === 0) return new Map();
  const sources = await db
    .select()
    .from(sourcesTable)
    .where(inArray(sourcesTable.id, ids));
  return new Map(sources.map((source) => [source.id, source]));
}

export function asPublicClinic(
  clinic: ClinicWithDetails,
  sources: Map<string, Source>,
) {
  const observations = clinic.observations.map((observation) =>
    serializeObservation(observation, sources.get(observation.sourceId)!),
  );
  const headlineObservation =
    observations.length > 0 ? observations[observations.length - 1] : null;
  return {
    id: clinic.id,
    slug: clinic.slug,
    name: clinic.name,
    city: clinic.city,
    state: clinic.state,
    address: clinic.address,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
    licensingStatus: clinic.licensingStatus,
    regulator: clinic.regulator,
    phone: clinic.phone,
    email: clinic.email,
    website: clinic.website,
    services: clinic.services,
    headlineObservation,
    lastReviewedAt: clinic.lastReviewedAt,
    demonstrationData: clinic.demonstrationData,
  };
}

export function asClinicProfile(
  clinic: ClinicWithDetails,
  sources: Map<string, Source>,
) {
  return {
    ...asPublicClinic(clinic, sources),
    observations: clinic.observations.map((observation) =>
      serializeObservation(observation, sources.get(observation.sourceId)!),
    ),
  };
}