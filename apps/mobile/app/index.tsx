import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { trpc } from "../lib/trpc";

export default function PracticesScreen() {
  const [search, setSearch] = useState("");
  const practices = trpc.practices.list.useQuery({ search });

  if (practices.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (practices.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Could not load practices.</Text>
        <Pressable onPress={() => practices.refetch()} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search practices or specialty"
        autoCapitalize="none"
        style={styles.search}
      />
      <FlatList
        data={practices.data ?? []}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl
            refreshing={practices.isRefetching}
            onRefresh={() => practices.refetch()}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>Nothing matches that.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: "/practice/[id]", params: { id: item.id } }} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.specialty}>{item.specialty}</Text>
              <Text style={styles.address}>{item.addressLine}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  search: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  name: { fontSize: 17, fontWeight: "600", color: "#1A1A2E" },
  specialty: { fontSize: 14, color: "#2563EB", marginTop: 2 },
  address: { fontSize: 13, color: "#4B5563", marginTop: 6 },
  empty: { textAlign: "center", color: "#4B5563", marginTop: 40 },
  error: { color: "#B91C1C" },
  retry: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#1A1A2E", borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
});
