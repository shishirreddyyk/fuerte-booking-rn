import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { trpc } from "../../lib/trpc";
import { useRep } from "../../store/rep";

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const rep = useRep();
  const utils = trpc.useUtils();

  const days = useMemo(() => {
    const out: Date[] = [];
    const start = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d);
    }
    return out.slice(0, 7);
  }, []);

  const [day, setDay] = useState(isoDay(days[0] ?? new Date()));

  const practice = trpc.practices.byId.useQuery({ id });
  const slots = trpc.slots.listByPractice.useQuery({ practiceId: id, day });

  const book = trpc.bookings.create.useMutation({
    onSuccess: async () => {
      // someone else's booking may have landed while this screen was open
      await utils.slots.listByPractice.invalidate({ practiceId: id, day });
      router.push("/confirmed");
    },
    onError: (err) => Alert.alert("Could not book", err.message),
  });

  if (practice.isLoading || slots.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.name}>{practice.data?.name}</Text>
      <Text style={styles.address}>{practice.data?.addressLine}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow}>
        {days.map((d) => {
          const value = isoDay(d);
          const active = value === day;
          return (
            <Pressable
              key={value}
              onPress={() => setDay(value)}
              style={[styles.dayChip, active && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                {d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.grid}>
        {(slots.data ?? []).map((slot) => (
          <Pressable
            key={slot.id}
            disabled={!slot.bookable || book.isPending}
            onPress={() =>
              book.mutate({
                slotId: slot.id,
                repName: rep.name,
                repEmail: rep.email,
                pushToken: rep.pushToken ?? undefined,
              })
            }
            style={[styles.slot, !slot.bookable && styles.slotDead]}
          >
            <Text style={[styles.slotTime, !slot.bookable && styles.slotTimeDead]}>
              {slot.startsAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            {!slot.bookable && <Text style={styles.slotLabel}>{slot.label}</Text>}
          </Pressable>
        ))}
        {(slots.data ?? []).length === 0 && (
          <Text style={styles.empty}>No slots that day.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 20, fontWeight: "700", color: "#1A1A2E" },
  address: { fontSize: 13, color: "#4B5563", marginTop: 4 },
  dayRow: { marginTop: 16, marginBottom: 8 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  dayChipActive: { backgroundColor: "#1A1A2E", borderColor: "#1A1A2E" },
  dayChipText: { color: "#4B5563", fontWeight: "600" },
  dayChipTextActive: { color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  slot: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2563EB",
    alignItems: "center",
  },
  slotDead: { borderColor: "#E5E7EB", backgroundColor: "#F3F4F6" },
  slotTime: { color: "#2563EB", fontWeight: "600" },
  slotTimeDead: { color: "#9CA3AF" },
  slotLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  empty: { color: "#4B5563", marginTop: 20 },
});
