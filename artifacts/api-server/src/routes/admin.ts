import { Router, type IRouter } from "express";
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
import { list, get, getMany, save } from "../lib/store";
import { requireAdmin } from "../lib/admin-auth";
import { comparabilityKey, loadSources, serializeObservation } from "../lib/ivf";

const router: IRouter = Router();
router.use("/admin", requireAdmin);

router.get("/admin/summary", async (_req, res): Promise<void> => {
  const [clinics, published, drafts, pending, recentAuditEvents] = await Promise.all([
    list("clinics"),
    list("rate_observations", { where: ["publicationStatus", "published"] }),
    list("rate_observations", { where: ["publicationStatus", "draft"] }),
    list("correction_submissions", { where: ["status", "pending"] }),
    list("audit_events", { orderBy: "createdAt", descending: true, limit: 8 }),
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
  const clinics = await list("clinics", { orderBy: "name" });
  res.json(
    ListAdminClinicsResponse.parse(
      await Promise.all(clinics.map(async (clinic) => ({
        ...clinic,
        services: await getMany("services", clinic.serviceIds ?? []),
        headlineObservation: null,
        demonstrationData: clinic.demonstrationData,
      }))),
    ),
  );
});

router.post("/admin/clinics", async (req, res): Promise<void> => {
  const parsed = CreateClinicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const clinicData = parsed.data;
  const clinic = await save("clinics", { ...clinicData, recordStatus: "draft" }, res.locals.adminUid);
  res.status(201).json(CreateClinicResponse.parse({
    ...clinic,
    services: await getMany("services", clinic.serviceIds ?? []),
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
  const clinicUpdate = parsed.data;
  const clinic = await save("clinics", { ...clinicUpdate }, res.locals.adminUid, params.data.id);
  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }
  res.json(UpdateClinicResponse.parse({
    ...clinic,
    services: await getMany("services", clinic.serviceIds ?? []),
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
  const clinic = await save("clinics", { recordStatus: "archived" }, res.locals.adminUid, params.data.id);
  if (!clinic) {
    res.status(404).json({ error: "Clinic not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/services", async (_req, res): Promise<void> => {
  res.json(ListServicesResponse.parse(await list("services", { orderBy: "name" })));
});

router.post("/admin/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const service = await save("services", { ...parsed.data }, res.locals.adminUid);
  res.status(201).json(CreateServiceResponse.parse(service));
});

router.get("/admin/sources", async (_req, res): Promise<void> => {
  res.json(ListSourcesResponse.parse(await list("sources", { orderBy: "title" })));
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
  const source = await save("sources", sourceData, res.locals.adminUid);
  res.status(201).json(CreateSourceResponse.parse(source));
});

router.get("/admin/rate-observations", async (_req, res): Promise<void> => {
  const observations = await list("rate_observations", { orderBy: "reportingPeriodEnd" });
  const sources = await loadSources(observations.map((item) => item.sourceId));
  res.json(ListRateObservationsResponse.parse(observations.map((item) => serializeObservation(item, sources.get(item.sourceId)!))));
});

router.post("/admin/rate-observations", async (req, res): Promise<void> => {
  const parsed = CreateRateObservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const source = await get("sources", parsed.data.sourceId);
  const clinic = await get("clinics", parsed.data.clinicId);
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
  const observation = await save("rate_observations", values, res.locals.adminUid);
  res.status(201).json(CreateRateObservationResponse.parse(serializeObservation(observation, source)));
});

router.post("/admin/rate-observations/:id/publish", async (req, res): Promise<void> => {
  const params = PublishRateObservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const observation = await get("rate_observations", params.data.id);
  if (!observation) {
    res.status(404).json({ error: "Observation not found" });
    return;
  }
  const source = await get("sources", observation.sourceId);
  if (!source || !observation.outcomeDefinition || !observation.denominatorDefinition || !observation.reportingPeriodStart || !observation.reportingPeriodEnd || observation.verificationStatus === "unverified") {
    res.status(400).json({ error: "Source, definitions, reporting period, and verification are required to publish." });
    return;
  }
  const updated = await save("rate_observations", { publicationStatus: "published" }, res.locals.adminUid, observation.id);
  res.json(PublishRateObservationResponse.parse(serializeObservation(updated, source)));
});

router.post("/admin/rate-observations/:id/unpublish", async (req, res): Promise<void> => {
  const params = UnpublishRateObservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const observation = await save("rate_observations", { publicationStatus: "archived" }, res.locals.adminUid, params.data.id);
  if (!observation) {
    res.status(404).json({ error: "Observation not found" });
    return;
  }
  const source = await get("sources", observation.sourceId);
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
  res.json(ListAuditEventsResponse.parse(await list("audit_events", { orderBy: "createdAt", descending: true })));
});

export default router;