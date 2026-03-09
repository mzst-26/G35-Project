import { Router } from "express";

export const paymentsRouter = Router();

paymentsRouter.post("/checkout", (_req, res) => {
  res.status(501).json({ message: "TODO: implement stripe checkout" });
});

paymentsRouter.post("/webhooks/stripe", (_req, res) => {
  res.status(501).json({ message: "TODO: implement stripe webhook handler" });
});
