import { and, eq } from "drizzle-orm";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  adminProfilesTable,
  auditEventsTable,
  clinicServicesTable,
  clinicsTable,
  correctionSubmissionsTable,
  db,
  rateObservationsTable,
  servicesTable,
  sourcesTable,
} from "@workspace/db";
import { DEMO_SOURCE_URL, comparabilityKey } from "./ivf";
import { logger } from "./logger";

const services = [
  ["IVF", "ivf", "In-vitro fertilisation treatment."],
  ["ICSI", "icsi", "Intracytoplasmic sperm injection."],
  ["Donor programmes", "donor-programmes", "Donor egg and embryo pathways."],
  ["Fertility preservation", "fertility-preservation", "Egg and embryo preservation."],
  ["Counselling", "counselling", "Support before, during, and after treatment."],
] as const;

const clinicSeeds = [
  ["aster-vale", "Aster Vale Reproductive Centre", "Nayapur", "Sahya Pradesh"],
  ["riverglass", "Riverglass IVF Studio", "Nayapur", "Sahya Pradesh"],
  ["kite-loom", "Kite & Loom Fertility Unit", "Suryanagar", "Dakshin Plateau"],
  ["mango-orbit", "Mango Orbit IVF Clinic", "Suryanagar", "Dakshin Plateau"],
  ["blue-lantern", "Blue Lantern Reproductive Care", "Madhavpur", "Kaveri Coast"],
  ["paper-banyan", "Paper Banyan Fertility House", "Madhavpur", "Kaveri Coast"],
  ["northstar", "Northstar Seed & Cycle Centre", "Ekatra", "Aravalli East"],
  ["marigold", "Marigold Arc IVF Clinic", "Ekatra", "Aravalli East"],
  ["cloudstep", "Cloudstep Reproductive Health", "Vasantgarh", "Sahya Pradesh"],
  ["indigo-well", "Indigo Well Fertility Centre", "Vasantgarh", "Sahya Pradesh"],
  ["sunroom", "Sunroom IVF & Family Care", "Tirath", "Dakshin Plateau"],
  ["quiet-river", "Quiet River Reproductive Clinic", "Tirath", "Dakshin Plateau"],
] as const;

type BangaloreRecord = {
  area: string;
  name: string;
  address: string;
  phone: string | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseBangaloreMarkdown(markdown: string): BangaloreRecord[] {
  let area = "";
  const records: BangaloreRecord[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const areaHeading = line.match(/^## (.+)$/);
    if (areaHeading && areaHeading[1] !== "Success Rate Data") {
      area = areaHeading[1].trim();
      continue;
    }
    if (!area || !line.startsWith("| ") || line.includes("|---")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 4 || cells[0] === "Center") continue;
    records.push({
      area,
      name: cells[0],
      address: cells[1],
      phone: cells[3] === "—" ? null : cells[3],
    });
  }
  return records;
}

function sourceData() {
  return {
    title: "Demonstration methodology note: how rate observations are described",
    sourceType: "Demonstration source",
    url: DEMO_SOURCE_URL,
    publisher: "India IVF Clinic Directory demonstration dataset",
    publishedOn: "2026-01-15",
    notes: "This source is fictional and exists only to make the demo provenance flow visible.",
  };
}

export async function seedDemoData(): Promise<void> {
  if (process.env.SEED_DEMO_DATA === "false") return;

  const [importedSource] = await db
    .select({ id: sourcesTable.id })
    .from(sourcesTable)
    .where(
      eq(
        sourcesTable.url,
        "https://example.invalid/imports/bangalore-ivf-centers-by-area",
      ),
    );
  if (importedSource) {
    logger.info("Skipping fictional seed data because the Bangalore import is active");
    return;
  }

  const [existingSource] = await db
    .select()
    .from(sourcesTable)
    .where(eq(sourcesTable.url, DEMO_SOURCE_URL));
  const source =
    existingSource ??
    (
      await db
        .insert(sourcesTable)
        .values(sourceData())
        .returning()
    )[0];

  const serviceRecords: Record<string, { id: string }> = {};
  for (const [name, slug, description] of services) {
    const [record] =
      (await db
        .select({ id: servicesTable.id })
        .from(servicesTable)
        .where(eq(servicesTable.slug, slug))) ?? [];
    const created =
      record ??
      (
        await db
          .insert(servicesTable)
          .values({ name, slug, description })
          .returning({ id: servicesTable.id })
      )[0];
    serviceRecords[slug] = created;
  }

  for (const [index, [slug, name, city, state]] of clinicSeeds.entries()) {
    const [existingClinic] = await db
      .select()
      .from(clinicsTable)
      .where(eq(clinicsTable.slug, slug));
    const clinic =
      existingClinic ??
      (
        await db
          .insert(clinicsTable)
          .values({
            slug,
            name,
            city,
            state,
            address: `${10 + index} Lantern Row, ${city}`,
            licensingStatus: "Demonstration record — not a real clinic",
            regulator: "Fictional Health Records Board",
            phone: "+91 00000 00000",
            email: `hello+${slug}@example.invalid`,
            website: "https://example.invalid",
            recordStatus: "published",
            lastReviewedAt: "2026-09-02",
            demonstrationData: true,
          })
          .returning()
      )[0];

    if (!clinic) continue;
    const selectedServices = [
      serviceRecords.ivf,
      serviceRecords.icsi,
      index % 2 === 0 ? serviceRecords.counselling : serviceRecords["donor-programmes"],
    ].filter(Boolean);
    for (const selected of selectedServices) {
      await db
        .insert(clinicServicesTable)
        .values({ clinicId: clinic.id, serviceId: selected.id })
        .onConflictDoNothing();
    }

    const [existingObservation] = await db
      .select({ id: rateObservationsTable.id })
      .from(rateObservationsTable)
      .where(eq(rateObservationsTable.clinicId, clinic.id));
    if (existingObservation) continue;

    const common = {
      clinicId: clinic.id,
      reportingPeriodStart: "2025-01-01",
      reportingPeriodEnd: "2025-12-31",
      yearLabel: "2025",
      methodologyNotes:
        "Demonstration observation. Read the outcome and denominator definitions before interpreting this percentage.",
      smallSample: index % 3 === 0,
      sourceId: source.id,
      verificationStatus: "source-reviewed",
      publicationStatus: "published",
      treatmentType: "IVF cycle",
      treatmentContext: index % 2 === 0 ? "fresh" : "frozen",
      cumulativeMethod: "non-cumulative",
    };
    await db.insert(rateObservationsTable).values([
      {
        ...common,
        outcomeType: "Clinical pregnancy",
        outcomeDefinition: "Ultrasound-confirmed clinical pregnancy per embryo transfer.",
        ratePercentage: String(34 + (index % 5)),
        numerator: 17 + index,
        denominatorCount: 50 + index * 3,
        denominatorType: "embryo transfers",
        denominatorDefinition: "All embryo transfers included in the clinic’s 2025 demonstration extract.",
        ageBand: "35–37",
        ageMeasurementPoint: "at egg retrieval",
        eggSource: "own eggs",
        priorTreatmentCohort: "not specified",
        comparabilityGroupKey: comparabilityKey({
          outcomeDefinition: "Ultrasound-confirmed clinical pregnancy per embryo transfer.",
          denominatorDefinition: "All embryo transfers included in the clinic’s 2025 demonstration extract.",
          ageBand: "35–37",
          ageMeasurementPoint: "at egg retrieval",
          eggSource: "own eggs",
          treatmentContext: common.treatmentContext,
          treatmentType: common.treatmentType,
          cumulativeMethod: common.cumulativeMethod,
          priorTreatmentCohort: "not specified",
          jurisdiction: state,
        }),
      },
      {
        ...common,
        outcomeType: "Live birth",
        outcomeDefinition: "Birth of at least one living infant per started treatment cycle.",
        ratePercentage: String(22 + (index % 4)),
        numerator: 8 + index,
        denominatorCount: 40 + index * 2,
        denominatorType: "started treatment cycles",
        denominatorDefinition: "All started treatment cycles, including cycles without transfer.",
        ageBand: "under 35",
        ageMeasurementPoint: "at treatment start",
        eggSource: "own eggs",
        treatmentContext: "combined",
        priorTreatmentCohort: "not specified",
        comparabilityGroupKey: comparabilityKey({
          outcomeDefinition: "Birth of at least one living infant per started treatment cycle.",
          denominatorDefinition: "All started treatment cycles, including cycles without transfer.",
          ageBand: "under 35",
          ageMeasurementPoint: "at treatment start",
          eggSource: "own eggs",
          treatmentContext: "combined",
          treatmentType: common.treatmentType,
          cumulativeMethod: common.cumulativeMethod,
          priorTreatmentCohort: "not specified",
          jurisdiction: state,
        }),
      },
    ]);
  }

  logger.info({ clinics: clinicSeeds.length }, "Demo IVF directory data ready");
}

export async function replaceWithBangaloreData(): Promise<void> {
  const relativePath =
    "attached_assets/Bangalore_IVF_Centers_by_Area_1788551004654.md";
  const filePath = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), "../../", relativePath),
    resolve(process.cwd(), "../", relativePath),
  ].find((candidate) => existsSync(candidate));
  if (!filePath) {
    throw new Error(`Could not locate ${relativePath}`);
  }
  const records = parseBangaloreMarkdown(readFileSync(filePath, "utf8"));
  if (records.length === 0) {
    throw new Error(`No Bangalore records found in ${filePath}`);
  }

  await db.transaction(async (tx) => {
    await tx.delete(rateObservationsTable);
    await tx.delete(clinicServicesTable);
    await tx.delete(correctionSubmissionsTable);
    await tx.delete(auditEventsTable);
    await tx.delete(adminProfilesTable);
    await tx.delete(clinicsTable);
    await tx.delete(servicesTable);
    await tx.delete(sourcesTable);

    const [source] = await tx
      .insert(sourcesTable)
      .values({
        title: "Bangalore IVF centers by area — attached import",
        sourceType: "Google Places compilation",
        url: "https://example.invalid/imports/bangalore-ivf-centers-by-area",
        publisher: "Attached user-provided dataset",
        publishedOn: "2026-09-05",
        notes:
          "Imported directly at the user's request. Ratings and phone numbers were retrieved from Google Places and should be verified before outreach. The source's chain-level success-rate claims are not imported as audited rate observations because their definitions are not disclosed.",
      })
      .returning({ id: sourcesTable.id });

    const [service] = await tx
      .insert(servicesTable)
      .values({
        name: "IVF and fertility care",
        slug: "ivf-and-fertility-care",
        description: "Imported classification from the attached Bangalore list.",
      })
      .returning({ id: servicesTable.id });

    for (const [index, record] of records.entries()) {
      const clinic = (
        await tx
          .insert(clinicsTable)
          .values({
            slug: `${slugify(record.name)}-${slugify(record.area)}-${index + 1}`,
            name: record.name,
            city: record.area,
            state: "Karnataka",
            address: record.address,
            licensingStatus: "Not verified — imported from attached Google Places list",
            regulator: "Not provided in source",
            phone: record.phone,
            recordStatus: "published",
            lastReviewedAt: "2026-09-05",
            demonstrationData: false,
          })
          .returning()
      )[0];

      await tx.insert(clinicServicesTable).values({
        clinicId: clinic.id,
        serviceId: service.id,
      });
    }
  });

  logger.warn(
    { clinics: records.length },
    "Replaced directory with directly published Bangalore import",
  );
}