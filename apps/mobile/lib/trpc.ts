import type { AppRouter } from "@fuerte/api/src/router";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import Constants from "expo-constants";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

function apiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return `${fromEnv}/trpc`;
  // dev fallback: the phone cannot reach localhost, so use the host machine's LAN
  // IP that the Metro bundler is already serving from
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host ?? "localhost"}:4000/trpc`;
}

export const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: apiUrl(), transformer: superjson })],
});
