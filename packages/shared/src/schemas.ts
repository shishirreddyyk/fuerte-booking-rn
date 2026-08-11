import { z } from "zod";

export const practiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  specialty: z.string().min(1),
  addressLine: z.string().min(1),
  timezone: z.string().min(1),
});
export type Practice = z.infer<typeof practiceSchema>;

export const slotStatus = z.enum(["open", "held", "booked"]);
export type SlotStatus = z.infer<typeof slotStatus>;

export const slotSchema = z.object({
  id: z.string().uuid(),
  practiceId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: slotStatus,
});
export type Slot = z.infer<typeof slotSchema>;

export const listSlotsInput = z.object({
  practiceId: z.string().uuid(),
  /** the local day the rep is shopping for, e.g. 2026-07-20 */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type ListSlotsInput = z.infer<typeof listSlotsInput>;

export const createBookingInput = z.object({
  slotId: z.string().uuid(),
  repName: z.string().min(2).max(80),
  repEmail: z.string().email(),
  note: z.string().max(280).optional(),
  /** Expo push token, so the confirmation can be pushed back to the device */
  pushToken: z.string().optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingInput>;

export const bookingSchema = z.object({
  id: z.string().uuid(),
  slotId: z.string().uuid(),
  practiceId: z.string().uuid(),
  repName: z.string(),
  repEmail: z.string().email(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type Booking = z.infer<typeof bookingSchema>;
