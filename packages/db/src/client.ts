import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set - copy .env.example to .env");

// max: 1 in serverless, more locally. Supabase poolers hate long-lived fat pools.
const queryClient = postgres(url, { max: Number(process.env.PG_POOL ?? 5) });

export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
