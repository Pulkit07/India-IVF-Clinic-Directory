import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clinicsTable } from "./clinics";
import { sourcesTable } from "./sources";

export const rateObservationsTable = pgTable(
  "rate_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinicsTable.id, { onDelete: "restrict" }),
    outcomeType: text("outcome_type").notNull(),
    outcomeDefinition: text("outcome_definition").notNull(),
    ratePercentage: numeric("rate_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),
    numerator: integer("numerator"),
    denominatorCount: integer("denominator_count"),
    denominatorType: text("denominator_type").notNull(),
    denominatorDefinition: text("denominator_definition").notNull(),
    ageBand: text("age_band").notNull(),
    ageMeasurementPoint: text("age_measurement_point"),
    eggSource: text("egg_source").notNull(),
    treatmentContext: text("treatment_context").notNull(),
    treatmentType: text("treatment_type").notNull(),
    priorTreatmentCohort: text("prior_treatment_cohort"),
    cumulativeMethod: text("cumulative_method").notNull(),
    reportingPeriodStart: date("reporting_period_start", { mode: "string" }).notNull(),
    reportingPeriodEnd: date("reporting_period_end", { mode: "string" }).notNull(),
    yearLabel: text("year_label").notNull(),
    methodologyNotes: text("methodology_notes").notNull(),
    smallSample: boolean("small_sample").notNull().default(false),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sourcesTable.id, { onDelete: "restrict" }),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    publicationStatus: text("publication_status").notNull().default("draft"),
    comparabilityGroupKey: text("comparability_group_key").notNull(),
    supersedesId: uuid("supersedes_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "rate_percentage_range_check",
      sql`${table.ratePercentage} >= 0 AND ${table.ratePercentage} <= 100`,
    ),
    check(
      "rate_numerator_nonnegative_check",
      sql`${table.numerator} IS NULL OR ${table.numerator} >= 0`,
    ),
    check(
      "rate_denominator_nonnegative_check",
      sql`${table.denominatorCount} IS NULL OR ${table.denominatorCount} >= 0`,
    ),
    index("rate_observations_clinic_idx").on(table.clinicId),
    index("rate_observations_publication_idx").on(
      table.publicationStatus,
      table.reportingPeriodEnd,
    ),
    index("rate_observations_comparability_idx").on(table.comparabilityGroupKey),
  ],
);

export const insertRateObservationSchema = createInsertSchema(
  rateObservationsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRateObservation = z.infer<typeof insertRateObservationSchema>;
export type RateObservation = typeof rateObservationsTable.$inferSelect;