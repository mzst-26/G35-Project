import { Router } from "express";

export const penaltiesRouter = Router();

penaltiesRouter.post("/charge", (_req, res) => {
  res.status(501).json({ message: "TODO: implement penalty charging" });
});
