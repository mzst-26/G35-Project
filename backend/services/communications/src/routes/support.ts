import { Router } from "express";

export const supportRouter = Router();

supportRouter.post("/tickets", (_req, res) => {
  res.status(501).json({ message: "TODO: implement support ticket create" });
});
