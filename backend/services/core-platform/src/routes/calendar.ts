import { Router } from "express";

export const calendarRouter = Router();

calendarRouter.patch("/availability/:workerId", (_req, res) => {
  res.status(501).json({ message: "TODO: enforce 7-day lock and availability rules" });
});
