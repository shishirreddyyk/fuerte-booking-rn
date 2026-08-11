import type { Slot } from "./schemas.js";

/** Minutes a rep gets with a doctor. Practices are all on the same grid for now. */
export const SLOT_MINUTES = 30;

/** How far ahead a booking has to be made. Walking up 2 minutes before is not a booking. */
export const MIN_LEAD_MINUTES = 60;

export interface TimeRange {
  startsAt: Date;
  endsAt: Date;
}

export interface DayWindow {
  /** local wall-clock hour the practice opens, e.g. 9 */
  openHour: number;
  /** local wall-clock hour the practice closes, e.g. 17 */
  closeHour: number;
  /** hours blocked out for lunch etc., as [start, end) pairs of wall-clock hours */
  blocks?: Array<[number, number]>;
}

/**
 * Build the slot grid for one day. Practices give us an open/close window and a
 * lunch block, not a list of slots - the grid is ours to generate.
 */
export function generateSlots(day: Date, window: DayWindow): TimeRange[] {
  if (window.closeHour <= window.openHour) {
    throw new Error("closeHour must be after openHour");
  }
  const out: TimeRange[] = [];
  const cursor = new Date(day);
  cursor.setHours(window.openHour, 0, 0, 0);

  const close = new Date(day);
  close.setHours(window.closeHour, 0, 0, 0);

  while (cursor < close) {
    const startsAt = new Date(cursor);
    const endsAt = new Date(cursor.getTime() + SLOT_MINUTES * 60_000);
    if (endsAt > close) break;
    if (!fallsInBlock(startsAt, endsAt, window.blocks ?? [])) {
      out.push({ startsAt, endsAt });
    }
    cursor.setTime(endsAt.getTime());
  }
  return out;
}

function fallsInBlock(
  startsAt: Date,
  endsAt: Date,
  blocks: Array<[number, number]>,
): boolean {
  return blocks.some(([blockStart, blockEnd]) => {
    const s = new Date(startsAt);
    s.setHours(blockStart, 0, 0, 0);
    const e = new Date(startsAt);
    e.setHours(blockEnd, 0, 0, 0);
    return overlaps({ startsAt, endsAt }, { startsAt: s, endsAt: e });
  });
}

/** Half-open [start, end) overlap. Back-to-back slots do not overlap. */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export type BookabilityReason =
  | "ok"
  | "slot_taken"
  | "slot_in_past"
  | "inside_lead_time"
  | "double_booked";

/**
 * Every rule that decides whether a rep can take this slot, in one place, with no
 * database and no clock of its own - `now` is passed in so the tests can move time.
 */
export function checkBookable(
  slot: Pick<Slot, "startsAt" | "endsAt" | "status">,
  now: Date,
  repExistingBookings: TimeRange[] = [],
): BookabilityReason {
  if (slot.status !== "open") return "slot_taken";
  if (slot.startsAt.getTime() <= now.getTime()) return "slot_in_past";
  const leadMs = slot.startsAt.getTime() - now.getTime();
  if (leadMs < MIN_LEAD_MINUTES * 60_000) return "inside_lead_time";
  if (repExistingBookings.some((b) => overlaps(b, slot))) return "double_booked";
  return "ok";
}

export function isBookable(
  slot: Pick<Slot, "startsAt" | "endsAt" | "status">,
  now: Date,
  repExistingBookings: TimeRange[] = [],
): boolean {
  return checkBookable(slot, now, repExistingBookings) === "ok";
}

/** Copy a rule's reason into something a human sees on a phone screen. */
export const reasonCopy: Record<BookabilityReason, string> = {
  ok: "Available",
  slot_taken: "Just taken",
  slot_in_past: "Already passed",
  inside_lead_time: "Too soon to book",
  double_booked: "You are already booked then",
};
