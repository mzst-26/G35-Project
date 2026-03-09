import { Router } from "express";

export const jobsRouter = Router();

jobsRouter.post("/", (_req, res) => {
  res.status(501).json({ message: "TODO: create job lifecycle endpoint" });
});
