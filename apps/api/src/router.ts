import { TRPCError } from "@trpc/server";
import { bookings, practices, slots } from "@fuerte/db";
import {
  checkBookable,
  createBookingInput,
  listSlotsInput,
  reasonCopy,
} from "@fuerte/shared";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "./trpc.js";
import { sendBookingPush } from "./push.js";

const practicesRouter = router({
  list: publicProcedure
    .input(z.object({ search: z.string().max(80).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.select().from(practices).orderBy(asc(practices.name));
      const search = input?.search?.trim().toLowerCase();
      if (!search) return rows;
      return rows.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.specialty.toLowerCase().includes(search),
      );
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(practices)
        .where(eq(practices.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No such practice" });
      return row;
    }),
});

const slotsRouter = router({
  listByPractice: publicProcedure.input(listSlotsInput).query(async ({ ctx, input }) => {
    const dayStart = new Date(`${input.day}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const rows = await ctx.db
      .select()
      .from(slots)
      .where(
        and(
          eq(slots.practiceId, input.practiceId),
          gte(slots.startsAt, dayStart),
          lt(slots.startsAt, dayEnd),
        ),
      )
      .orderBy(asc(slots.startsAt));

    const now = ctx.now();
    // the phone renders whatever we send, so the reason for a dead slot is decided
    // here and shipped with it - no rule logic in the app
    return rows.map((slot) => {
      const reason = checkBookable(slot, now);
      return { ...slot, bookable: reason === "ok", reason, label: reasonCopy[reason] };
    });
  }),
});

const bookingsRouter = router({
  create: publicProcedure.input(createBookingInput).mutation(async ({ ctx, input }) => {
    return ctx.db.transaction(async (tx) => {
      // lock the row first. without FOR UPDATE two reps who tap Confirm in the same
      // second both read status = open and both think they won.
      const [slot] = await tx
        .select()
        .from(slots)
        .where(eq(slots.id, input.slotId))
        .for("update")
        .limit(1);

      if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "No such slot" });

      const repBookings = await tx
        .select({ startsAt: slots.startsAt, endsAt: slots.endsAt })
        .from(bookings)
        .innerJoin(slots, eq(bookings.slotId, slots.id))
        .where(eq(bookings.repEmail, input.repEmail));

      const reason = checkBookable(slot, ctx.now(), repBookings);
      if (reason !== "ok") {
        throw new TRPCError({ code: "CONFLICT", message: reasonCopy[reason] });
      }

      const [booking] = await tx
        .insert(bookings)
        .values({
          slotId: slot.id,
          practiceId: slot.practiceId,
          repName: input.repName,
          repEmail: input.repEmail,
          note: input.note ?? null,
          pushToken: input.pushToken ?? null,
        })
        .returning();

      await tx.update(slots).set({ status: "booked" }).where(eq(slots.id, slot.id));

      if (input.pushToken && booking) {
        // fire and forget - a dead Expo token should not fail a real booking
        void sendBookingPush(input.pushToken, slot.startsAt).catch((err) =>
          console.error("push failed", err),
        );
      }
      return booking!;
    });
  }),

  mine: publicProcedure
    .input(z.object({ repEmail: z.string().email() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: bookings.id,
          createdAt: bookings.createdAt,
          note: bookings.note,
          startsAt: slots.startsAt,
          endsAt: slots.endsAt,
          practiceName: practices.name,
        })
        .from(bookings)
        .innerJoin(slots, eq(bookings.slotId, slots.id))
        .innerJoin(practices, eq(bookings.practiceId, practices.id))
        .where(eq(bookings.repEmail, input.repEmail))
        .orderBy(asc(slots.startsAt));
    }),
});

export const appRouter = router({
  practices: practicesRouter,
  slots: slotsRouter,
  bookings: bookingsRouter,
});

export type AppRouter = typeof appRouter;
