import { relations, sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const slotStatusEnum = pgEnum("slot_status", ["open", "held", "booked"]);

export const practices = pgTable("practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  addressLine: text("address_line").notNull(),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const slots = pgTable(
  "slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: slotStatusEnum("status").notNull().default("open"),
  },
  (t) => ({
    // the query the slot list screen actually runs
    byPracticeAndStart: index("slots_practice_starts_idx").on(t.practiceId, t.startsAt),
    // a practice cannot have two slots at the same instant - the DB enforces it,
    // not the app
    noDuplicateStart: uniqueIndex("slots_practice_start_unique").on(
      t.practiceId,
      t.startsAt,
    ),
  }),
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => slots.id, { onDelete: "restrict" }),
    practiceId: uuid("practice_id")
      .notNull()
      .references(() => practices.id, { onDelete: "cascade" }),
    repName: text("rep_name").notNull(),
    repEmail: text("rep_email").notNull(),
    note: text("note"),
    pushToken: text("push_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // the real double-booking guard: one booking per slot, enforced in Postgres.
    // two reps hitting confirm at the same moment, one of them loses here.
    oneBookingPerSlot: uniqueIndex("bookings_slot_unique").on(t.slotId),
    byRep: index("bookings_rep_email_idx").on(t.repEmail, t.createdAt),
  }),
);

export const practicesRelations = relations(practices, ({ many }) => ({
  slots: many(slots),
  bookings: many(bookings),
}));

export const slotsRelations = relations(slots, ({ one }) => ({
  practice: one(practices, { fields: [slots.practiceId], references: [practices.id] }),
  booking: one(bookings, { fields: [slots.id], references: [bookings.slotId] }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  slot: one(slots, { fields: [bookings.slotId], references: [slots.id] }),
  practice: one(practices, { fields: [bookings.practiceId], references: [practices.id] }),
}));

export const startOfDay = (day: string, tz: string) =>
  sql`(${day}::date AT TIME ZONE ${tz})`;
