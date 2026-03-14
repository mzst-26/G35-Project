import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { authLogger, initialiseSentry } from "./observability/index.js";

initialiseSentry();
const app = createApp();

app.listen(Number(env.PORT), () => {
  authLogger.info("identity service listening", { port: Number(env.PORT) });
});
