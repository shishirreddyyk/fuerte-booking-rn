import * as trpcExpress from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import { appRouter } from "./router.js";
import { createContext } from "./trpc.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`trpc ${path} blew up:`, error.cause ?? error);
      }
    },
  }),
);

// Express 5 forwards async rejections here on its own, which 4 never did
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`api listening on :${port}`));
