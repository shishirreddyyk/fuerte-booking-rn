import { initTRPC } from "@trpc/server";
import type * as trpcExpress from "@trpc/server/adapters/express";
import { db, type Db } from "@fuerte/db";
import superjson from "superjson";

/**
 * Written out rather than inferred: with pnpm's symlinked node_modules an inferred
 * context makes tsc emit "cannot be named without a reference to..." (TS2742) as soon
 * as this package emits declarations.
 */
export interface Context {
  db: Db;
  /** real auth is a session lookup here - the header is a placeholder, but every
   *  procedure already reads identity from context instead of trusting its input */
  repEmail: string | null;
  /** injected so tests can move the clock without mocking Date */
  now: () => Date;
}

export function createContext({
  req,
}: trpcExpress.CreateExpressContextOptions): Context {
  return {
    db,
    repEmail: req.header("x-rep-email") ?? null,
    now: () => new Date(),
  };
}

// superjson so Dates survive the wire and the app gets a Date, not a string
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
