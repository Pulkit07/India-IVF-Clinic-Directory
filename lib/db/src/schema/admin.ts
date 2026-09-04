import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminProfilesTable = pgTable("admin_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalUserId: text("external_user_id").notNull().unique(),
  role: text("role").notNull().default("editor"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditEventsTable = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeSnapshot: jsonb("before_snapshot"),
  afterSnapshot: jsonb("after_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;

export const correctionSubmissionsTable = pgTable("correction_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clinicSlug: text("clinic_slug").notNull(),
  observationId: text("observation_id"),
  message: text("message").notNull(),
  contactEmail: text("contact_email").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCorrectionSchema = createInsertSchema(
  correctionSubmissionsTable,
).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertCorrection = z.infer<typeof insertCorrectionSchema>;