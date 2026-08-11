import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { registerForPush } from "../lib/push";
import { trpc, trpcClient } from "../lib/trpc";
import { useRep } from "../store/rep";

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // slot lists go stale fast - someone else may have taken the 2pm
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );
  const setPushToken = useRep((s) => s.setPushToken);

  useEffect(() => {
    registerForPush().then(setPushToken).catch(() => setPushToken(null));
  }, [setPushToken]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#1A1A2E",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#F7F7F9" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Practices" }} />
          <Stack.Screen name="practice/[id]" options={{ title: "Pick a time" }} />
          <Stack.Screen name="confirmed" options={{ title: "Confirmed" }} />
        </Stack>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
