/**
 * Expo push, called after a booking commits. Kept dumb on purpose: one fetch, no
 * retry queue yet - a dropped confirmation push is annoying, a dropped booking is not
 * acceptable, so this never runs inside the transaction.
 */
export async function sendBookingPush(pushToken: string, startsAt: Date) {
  const body = {
    to: pushToken,
    sound: "default",
    title: "Appointment confirmed",
    body: `You are booked for ${startsAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })}.`,
    data: { type: "booking_confirmed", startsAt: startsAt.toISOString() },
  };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Expo push returned ${res.status}`);
  return res.json();
}
