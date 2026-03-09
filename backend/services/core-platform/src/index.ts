import { createLogger } from "@infra/shared-utils";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const logger = createLogger("core-platform-service");
const app = createApp();

app.listen(Number(env.PORT), () => {
  logger.info({ port: Number(env.PORT) }, "core platform service listening");
});
