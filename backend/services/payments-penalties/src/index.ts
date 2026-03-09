import { createLogger } from "@infra/shared-utils";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const logger = createLogger("payments-penalties-service");
const app = createApp();

app.listen(Number(env.PORT), () => {
  logger.info({ port: Number(env.PORT) }, "payments penalties service listening");
});
