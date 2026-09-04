import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  ArchiveClinicParams,
  CreateClinicBody,
  CreateClinicResponse,
  CreateRateObservationBody,
  CreateRateObservationResponse,
  CreateServiceBody,
  CreateServiceResponse,
  CreateSourceBody,
  CreateSourceResponse,
  GetAdminSummaryResponse,
  ListAdminClinicsResponse,
  ListAuditEventsResponse,
  ListRateObservationsResponse,
  ListServicesResponse,
  ListSourcesResponse,
  PublishRateObservationParams,
  PublishRateObservationResponse,
  PreviewImportBody,
  PreviewImportResponse,
  UnpublishRateObservationParams,
  UnpublishRateObservationResponse,
  UpdateClinicBody,
  UpdateClinicParams,
  UpdateClinicResponse,
} from "@workspace/api-zod";
import {
  auditEventsTable,
  clinicServicesTable,
  clinicsTable,
  correctionSubmissionsTable,
  db,
  rateObservationsTable,
  servicesTable,
  sourcesTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/admin-auth";
import { comparabilityKey, loadSources, serializeObservation } from "../lib/ivf";

const router: IRouter = Router();
router.use("/admin", requireAdmin);

router.get("/admin/summary", async (_req, res): Promise<void> => {
  const [clinics, published, drafts, pending, recentAuditEvents] = await Promise.all([
    db.select({ id: clinicsTable.id }).from(clinicsTable),
    db.select({ id: rateObservationsTable.id }).from(rateObservationsTable).where(eq(rateObservationsTable.publicationStatus, "published")),
    db.select({ id: rateObservationsTable.id }).from(rateObservationsTable).where(eq(rateObservationsTable.publicationStatus, "draft")),
    db.select({ id: correctionSubmissionsTable.id }).from(correctionSubmissionsTable).where(eq(correctionSubmissionsTable.status, "pending")),
    db.select().from(auditEventsTable).orderBy(asc(auditEventsTable.createdAt)).limit(8),
  ]);
  const response = {
    clinicCount: clinics.length,
    publishedObservationCount: published.length,
    draftObservationCount: drafts.length,
    pendingCorrectionCount: pending.length,
    recentAuditEvents,
  };
  res.json(GetAdminSummaryResponse.parse(response));
});

router.get("/admin/clinics", async (_req, res): Promise<void> => {
  const clinics = await db.select().from(clinicsTable).orderBy(asc(clinicsTable.name));
  res.json(
    ListAdminClinicsResponse.parse(
      clinics.map((clinic) => ({
        ...clinic,
        services: [],
        headlineObservation: null,
        demonstrationData: clinic.demonstrationData,
      })),
    ),
  );
});

router.post("/admin/clinics", async (req, res): Promise<void> => {
  const parsed = CreateClinicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { serviceIds: _serviceIds, ...clinicData } = parsed.data;
  const [clinic] = await db.insert(clinicsTable).values({
    ...clinicData,
    recordStatus: "draft",
  }).returning();
  res.status(201).json(CreateClinicResponse.parse({
    ...clinic,
    services: [],
    headlineObservation: null,
    demonstrationData: clinic.demonstrationData,
  }));
});

router.patch("/admin/clinics/:id", async (req, res): Promise<void> => {
  const params = UpdateClinicParams.safeParse(req.params);
  const parsed = UpdateClinicBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { serviceIds: _serviceIds, ...clinicUpdate } = parsed.data;
  const [clinic] = await db
    .update(clinicsTable)
    .set(clinicUpdate)
    .where(eq(clinicsTable.id, params.data.id))
    .returning();
  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }
  res.json(UpdateClinicResponse.parse({
    ...clinic,
    services: [],
    headlineObservation: null,
    demonstrationData: clinic.demonstrationData,
  }));
});

router.delete("/admin/clinics/:id", async (req, res): Promise<void> => {
  const params = ArchiveClinicParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [clinic] = await db
    .update(clinicsTable)
    .set({ recordStatus: "archived" })
    .where(eq(clinicsTable.id, params.data.id))
    .returning({ id: clinicsTable.id });
  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/services", async (_req, res): Promise<void> => {
  res.json(ListServicesResponse.parse(await db.select().from(servicesTable).orderBy(asc(servicesTable.name))));
});

router.post("/admin/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db.insert(servicesTable).values(parsed.data).returning();
  res.status(201).json(CreateServiceResponse.parse(service));
});

router.get("/admin/sources", async (_req, res): Promise<void> => {
  res.json(ListSourcesResponse.parse(await db.select().from(sourcesTable).orderBy(asc(sourcesTable.title))));
});

router.post("/admin/sources", async (req, res): Promise<void> => {
  const parsed = CreateSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const sourceData = {
    ...parsed.data,
    publishedOn: parsed.data.publishedOn?.toISOString().slice(0, 10),
  };
  const [source] = await db.insert(sourcesTable).values(sourceData).returning();
  res.status(201).json(CreateSourceResponse.parse(source));
});

router.get("/admin/rate-observations", async (_req, res): Promise<void> => {
  const observations = await db.select().from(rateObservationsTable).orderBy(asc(rateObservationsTable.reportingPeriodEnd));
  const sources = await loadSources(observations.map((item) => item.sourceId));
  res.json(ListRateObservationsResponse.parse(observations.map((item) => serializeObservation(item, sources.get(item.sourceId)!))));
});

router.post("/admin/rate-observations", async (req, res): Promise<void> => {
  const parsed = CreateRateObservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, parsed.data.sourceId));
  const [clinic] = await db.select().from(clinicsTable).where(eq(clinicsTable.id, parsed.data.clinicId));
  if (!source || !clinic) {
    res.status(400).json({ error: "Clinic and source must exist before creating an observation." });
    return;
  }
  const {
    sourceId: _sourceId,
    reportingPeriodStart,
    reportingPeriodEnd,
    ...observationData
  } = parsed.data;
  const values = {
    ...observationData,
    sourceId: parsed.data.sourceId,
    reportingPeriodStart: reportingPeriodStart.toISOString().slice(0, 10),
    reportingPeriodEnd: reportingPeriodEnd.toISOString().slice(0, 10),
    ratePercentage: String(parsed.data.ratePercentage),
    comparabilityGroupKey: comparabilityKey({
      ...parsed.data,
      jurisdiction: clinic.state,
    }),
  };
  const [observation] = await db.insert(rateObservationsTable).values(values).returning();
  res.status(201).json(CreateRateObservationResponse.parse(serializeObservation(observation, source)));
});

router.post("/admin/rate-observations/:id/publish", async (req, res): Promise<void> => {
  const params = PublishRateObservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [observation] = await db.select().from(rateObservationsTable).where(eq(rateObservationsTable.id, params.data.id));
  if (!observation) {
    res.status(404).json({ error: "Observation not found" });
    return;
  }
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, observation.sourceId));
  if (!source || !observation.outcomeDefinition || !observation.denominatorDefinition || !observation.reportingPeriodStart || !observation.reportingPeriodEnd || observation.verificationStatus === "unverified") {
    res.status(400).json({ error: "Source, definitions, reporting period, and verification are required to publish." });
    return;
  }
  const [updated] = await db.update(rateObservationsTable).set({ publicationStatus: "published" }).where(eq(rateObservationsTable.id, observation.id)).returning();
  res.json(PublishRateObservationResponse.parse(serializeObservation(updated, source)));
});

router.post("/admin/rate-observations/:id/unpublish", async (req, res): Promise<void> => {
  const params = UnpublishRateObservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [observation] = await db.update(rateObservationsTable).set({ publicationStatus: "archived" }).where(eq(rateObservationsTable.id, params.data.id)).returning();
  if (!observation) {
    res.status(404).json({ error: "Observation not found" });
    return;
  }
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, observation.sourceId));
  res.json(UnpublishRateObservationResponse.parse(serializeObservation(observation, source!)));
});

router.post("/admin/import/preview", async (req, res): Promise<void> => {
  const parsed = PreviewImportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const lines = parsed.data.csvText.trim().split(/\r?\n/);
  const headers = lines[0]?.split(",").map((header) => header.trim()) ?? [];
  const errors = headers.length === 0 ? [{ rowNumber: 1, field: "csvText", message: "A header row is required." }] : [];
  const totalRows = Math.max(lines.length - 1, 0);
  res.json(PreviewImportResponse.parse({
    totalRows,
    validRows: errors.length === 0 ? totalRows : 0,
    invalidRows: errors.length === 0 ? 0 : totalRows,
    duplicateRows: 0,
    errors,
  }));
});

router.get("/admin/audit-events", async (_req, res): Promise<void> => {
  res.json(ListAuditEventsResponse.parse(await db.select().from(auditEventsTable).orderBy(asc(auditEventsTable.createdAt))));
});

export default router;