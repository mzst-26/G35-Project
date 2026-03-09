import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { notificationsRouter } from "./routes/notifications.js";
import { chatRouter } from "./routes/chat.js";
import { supportRouter } from "./routes/support.js";

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/support", supportRouter);

  return app;
};
