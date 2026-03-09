import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { paymentsRouter } from "./routes/payments.js";
import { penaltiesRouter } from "./routes/penalties.js";

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/penalties", penaltiesRouter);

  return app;
};
