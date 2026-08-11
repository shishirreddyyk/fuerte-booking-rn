import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { trpc } from "../lib/trpc";
import { useRep } from "../store/rep";

export default function ConfirmedScreen() {
  const email = useRep((s) => s.email);
  const mine = trpc.bookings.mine.useQuery({ repEmail: email });

  if (mine.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>You are booked.</Text>
      <Text style={styles.sub}>A confirmation push is on its way to this device.</Text>

      <FlatList
        data={mine.data ?? []}
        keyExtractor={(b) => b.id}
        style={{ marginTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.practice}>{item.practiceName}</Text>
            <Text style={styles.when}>
              {item.startsAt.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
            {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          </View>
        )}
      />

      <Link href="/" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Book another</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 22, fontWeight: "700", color: "#1A1A2E" },
  sub: { fontSize: 14, color: "#4B5563", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  practice: { fontSize: 16, fontWeight: "600", color: "#1A1A2E" },
  when: { fontSize: 14, color: "#2563EB", marginTop: 4 },
  note: { fontSize: 13, color: "#4B5563", marginTop: 6 },
  button: {
    backgroundColor: "#1A1A2E",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
