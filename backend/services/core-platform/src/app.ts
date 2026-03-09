import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./routes/health.js";
import { jobsRouter } from "./routes/jobs.js";
import { calendarRouter } from "./routes/calendar.js";

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/calendar", calendarRouter);

  return app;
};
