import { Router } from "express";

export const chatRouter = Router();

chatRouter.post("/messages", (_req, res) => {
  res.status(501).json({ message: "TODO: implement chat persistence" });
});
