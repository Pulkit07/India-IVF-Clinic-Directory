import { Router, type IRouter } from "express";
import {
  GetClinicParams,
  GetClinicResponse,
  ListClinicsQueryParams,
  ListClinicsResponse,
  ListLocationsResponse,
} from "@workspace/api-zod";
import {
  asClinicProfile,
  asPublicClinic,
  loadPublishedClinics,
  loadSources,
} from "../lib/ivf";

const router: IRouter = Router();

router.get("/clinics", async (req, res): Promise<void> => {
  const parsed = ListClinicsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clinics = await loadPublishedClinics();
  const sourceIds = [
    ...new Set(clinics.flatMap((clinic) => clinic.observations.map((item) => item.sourceId))),
  ];
  const sources = await loadSources(sourceIds);
  const filters = parsed.data;
  const normalizedQuery = filters.q?.trim().toLowerCase();
  const matches = clinics.filter((clinic) => {
    const textMatches =
      normalizedQuery == null ||
      [clinic.name, clinic.city, clinic.state]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const locationMatches =
      filters.location == null ||
      `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, "-") === filters.location.toLowerCase() ||
      clinic.city.toLowerCase().includes(filters.location.toLowerCase());
    const serviceMatches =
      filters.service == null ||
      clinic.services.some(
        (service) =>
          service.slug === filters.service || service.name.toLowerCase() === filters.service?.toLowerCase(),
      );
    const observations = clinic.observations;
    const observationMatches = observations.some((observation) => {
      const yearMatches =
        filters.reportingYear == null || Number(observation.yearLabel) === filters.reportingYear;
      return (
        yearMatches &&
        (filters.ageBand == null || observation.ageBand === filters.ageBand) &&
        (filters.outcomeType == null || observation.outcomeType === filters.outcomeType) &&
        (filters.denominatorType == null ||
          observation.denominatorType === filters.denominatorType) &&
        (filters.eggSource == null || observation.eggSource === filters.eggSource) &&
        (filters.verificationType == null ||
          observation.verificationStatus === filters.verificationType)
      );
    });
    const hasObservationFilters =
      filters.ageBand != null ||
      filters.outcomeType != null ||
      filters.denominatorType != null ||
      filters.eggSource != null ||
      filters.verificationType != null ||
      filters.reportingYear != null;
    return textMatches && locationMatches && serviceMatches && (!hasObservationFilters || observationMatches);
  });

  const locations = [...new Map(
    clinics.map((clinic) => [
      `${clinic.city}-${clinic.state}`,
      { slug: `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, "-"), city: clinic.city, state: clinic.state, clinicCount: 0 },
    ]),
  ).values()];
  for (const location of locations) {
    location.clinicCount = clinics.filter(
      (clinic) => clinic.city === location.city && clinic.state === location.state,
    ).length;
  }

  const response = {
    items: matches.map((clinic) => asPublicClinic(clinic, sources)),
    total: matches.length,
    availableLocations: locations,
    availableServices: [...new Map(
      clinics.flatMap((clinic) => clinic.services).map((service) => [service.id, service]),
    ).values()],
  };
  res.json(ListClinicsResponse.parse(response));
});

router.get("/clinics/:slug", async (req, res): Promise<void> => {
  const parsed = GetClinicParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clinics = await loadPublishedClinics();
  const clinic = clinics.find((item) => item.slug === parsed.data.slug);
  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }

  const sources = await loadSources(clinic.observations.map((item) => item.sourceId));
  res.json(GetClinicResponse.parse(asClinicProfile(clinic, sources)));
});

router.get("/locations", async (_req, res): Promise<void> => {
  const clinics = await loadPublishedClinics();
  const locations = new Map<string, { slug: string; city: string; state: string; clinicCount: number }>();
  for (const clinic of clinics) {
    const slug = `${clinic.city}-${clinic.state}`.toLowerCase().replace(/\s+/g, "-");
    const existing = locations.get(slug);
    if (existing) existing.clinicCount += 1;
    else locations.set(slug, { slug, city: clinic.city, state: clinic.state, clinicCount: 1 });
  }
  res.json(ListLocationsResponse.parse([...locations.values()]));
});

export default router;