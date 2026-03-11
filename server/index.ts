import express from "express";
import { registerRoutes } from "./routes";
import { assertServerEnv } from "./env";
import { setupCors } from "./setup/cors";
import { setupBodyParsing } from "./setup/body-parsing";
import { setupRequestLogging } from "./setup/request-logging";
import { configureExpoAndLanding } from "./setup/expo-hosting";
import { setupErrorHandler } from "./setup/error-handler";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

(async () => {
  try {
    assertServerEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server environment validation failed";
    console.error(message);
    process.exit(1);
  }

  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      console.log(`express server serving on port ${port}`);
    }
  );
})();
