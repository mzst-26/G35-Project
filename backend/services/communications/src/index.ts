import { createLogger } from "@infra/shared-utils";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const logger = createLogger("communications-service");
const app = createApp();

app.listen(Number(env.PORT), () => {
  logger.info({ port: Number(env.PORT) }, "communications service listening");
});
