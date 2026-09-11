import type { Clinic, RateObservation, Service, Source } from "@workspace/db/schema";
import { list, getMany } from "./store";

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
  const clinics = await list("clinics", { where: ["recordStatus", "published"] });
  if (!clinics.length) return [];
  const [services, observations] = await Promise.all([
    getMany("services", clinics.flatMap(clinic => clinic.serviceIds ?? [])),
    list("rate_observations", { where: ["publicationStatus", "published"] }),
  ]);
  const serviceMap = new Map(services.map(service => [service.id, service]));
  return clinics.sort((a, b) => a.name.localeCompare(b.name)).map(clinic => ({
    ...clinic,
    services: (clinic.serviceIds ?? []).flatMap(id => serviceMap.has(id) ? [serviceMap.get(id)!] : []),
    observations: observations.filter(item => item.clinicId === clinic.id).sort((a, b) => a.reportingPeriodEnd.localeCompare(b.reportingPeriodEnd)),
  }));
}

export async function loadSources(ids: string[]): Promise<Map<string, Source>> {
  return new Map((await getMany("sources", ids)).map(source => [source.id, source]));
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