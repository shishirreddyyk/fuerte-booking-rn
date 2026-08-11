import { generateSlots } from "@fuerte/shared";
import { db } from "./client.js";
import { bookings, practices, slots } from "./schema.js";

const SEED_PRACTICES = [
  {
    name: "Bay Cardiology Group",
    specialty: "Cardiology",
    addressLine: "450 Sutter St, San Francisco, CA",
    timezone: "America/Los_Angeles",
  },
  {
    name: "Mission Family Medicine",
    specialty: "Primary Care",
    addressLine: "2100 Mission St, San Francisco, CA",
    timezone: "America/Los_Angeles",
  },
  {
    name: "Westside Dermatology",
    specialty: "Dermatology",
    addressLine: "11500 Olympic Blvd, Los Angeles, CA",
    timezone: "America/Los_Angeles",
  },
];

async function main() {
  await db.delete(bookings);
  await db.delete(slots);
  await db.delete(practices);

  const inserted = await db.insert(practices).values(SEED_PRACTICES).returning();
  console.log(`inserted ${inserted.length} practices`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let slotCount = 0;
  for (const practice of inserted) {
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const day = new Date(today);
      day.setDate(day.getDate() + dayOffset);
      // practices do not see reps on weekends
      if (day.getDay() === 0 || day.getDay() === 6) continue;

      const grid = generateSlots(day, {
        openHour: 9,
        closeHour: 17,
        blocks: [[12, 13]],
      });

      const rows = grid.map((s) => ({
        practiceId: practice.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      }));
      await db.insert(slots).values(rows).onConflictDoNothing();
      slotCount += rows.length;
    }
  }
  console.log(`inserted ${slotCount} slots`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
