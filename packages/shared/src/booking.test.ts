import { describe, expect, it } from "vitest";
import {
  SLOT_MINUTES,
  checkBookable,
  generateSlots,
  isBookable,
  overlaps,
} from "./booking.js";
import { createBookingInput, listSlotsInput } from "./schemas.js";

const day = new Date(2026, 6, 20); // Mon Jul 20 2026, local
const at = (h: number, m = 0) => new Date(2026, 6, 20, h, m, 0, 0);

describe("generateSlots", () => {
  it("fills the open window on a 30 minute grid", () => {
    const slots = generateSlots(day, { openHour: 9, closeHour: 12 });
    expect(slots).toHaveLength(6);
    expect(slots[0]!.startsAt).toEqual(at(9, 0));
    expect(slots[0]!.endsAt).toEqual(at(9, 30));
    expect(slots.at(-1)!.endsAt).toEqual(at(12, 0));
  });

  it("drops slots that collide with a lunch block", () => {
    const slots = generateSlots(day, {
      openHour: 11,
      closeHour: 14,
      blocks: [[12, 13]],
    });
    const starts = slots.map((s) => s.startsAt.getHours());
    expect(starts).not.toContain(12);
    expect(slots).toHaveLength(4);
  });

  it("never emits a slot that runs past closing", () => {
    const slots = generateSlots(day, { openHour: 9, closeHour: 10 });
    for (const s of slots) expect(s.endsAt.getTime()).toBeLessThanOrEqual(at(10).getTime());
  });

  it("refuses a window that closes before it opens", () => {
    expect(() => generateSlots(day, { openHour: 17, closeHour: 9 })).toThrow();
  });

  it("keeps slots exactly SLOT_MINUTES long", () => {
    const slots = generateSlots(day, { openHour: 9, closeHour: 17 });
    for (const s of slots) {
      expect(s.endsAt.getTime() - s.startsAt.getTime()).toBe(SLOT_MINUTES * 60_000);
    }
  });
});

describe("overlaps", () => {
  it("treats back-to-back slots as not overlapping", () => {
    expect(
      overlaps(
        { startsAt: at(9), endsAt: at(9, 30) },
        { startsAt: at(9, 30), endsAt: at(10) },
      ),
    ).toBe(false);
  });

  it("catches a partial overlap in either direction", () => {
    const a = { startsAt: at(9), endsAt: at(9, 30) };
    const b = { startsAt: at(9, 15), endsAt: at(9, 45) };
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(b, a)).toBe(true);
  });
});

describe("checkBookable", () => {
  const now = at(9, 0);
  const openSlot = (h: number, m = 0) => ({
    startsAt: at(h, m),
    endsAt: new Date(at(h, m).getTime() + SLOT_MINUTES * 60_000),
    status: "open" as const,
  });

  it("allows an open slot outside the lead window", () => {
    expect(checkBookable(openSlot(14), now)).toBe("ok");
    expect(isBookable(openSlot(14), now)).toBe(true);
  });

  it("rejects a slot someone already booked", () => {
    expect(checkBookable({ ...openSlot(14), status: "booked" }, now)).toBe("slot_taken");
  });

  it("rejects a slot in the past", () => {
    expect(checkBookable(openSlot(8), now)).toBe("slot_in_past");
  });

  it("rejects a slot inside the one hour lead time", () => {
    expect(checkBookable(openSlot(9, 30), now)).toBe("inside_lead_time");
  });

  it("rejects a slot the rep is already booked against", () => {
    const conflict = [{ startsAt: at(14, 15), endsAt: at(14, 45) }];
    expect(checkBookable(openSlot(14), now, conflict)).toBe("double_booked");
  });

  it("lets a rep book back-to-back with an existing booking", () => {
    const adjacent = [{ startsAt: at(13, 30), endsAt: at(14, 0) }];
    expect(checkBookable(openSlot(14), now, adjacent)).toBe("ok");
  });
});

describe("input schemas", () => {
  it("rejects a malformed day string", () => {
    const bad = listSlotsInput.safeParse({
      practiceId: "3f1a1c0e-2b6d-4f5a-9c9e-0a1b2c3d4e5f",
      day: "20-07-2026",
    });
    expect(bad.success).toBe(false);
  });

  it("rejects a booking with a junk email", () => {
    const bad = createBookingInput.safeParse({
      slotId: "3f1a1c0e-2b6d-4f5a-9c9e-0a1b2c3d4e5f",
      repName: "Shishir",
      repEmail: "not-an-email",
    });
    expect(bad.success).toBe(false);
  });

  it("accepts a well formed booking", () => {
    const ok = createBookingInput.safeParse({
      slotId: "3f1a1c0e-2b6d-4f5a-9c9e-0a1b2c3d4e5f",
      repName: "Shishir",
      repEmail: "rep@example.com",
      note: "Dropping samples",
    });
    expect(ok.success).toBe(true);
  });
});
