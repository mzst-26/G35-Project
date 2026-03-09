import { Router } from "express";

export const authRouter = Router();

authRouter.post("/login", (_req, res) => {
  res.status(501).json({ message: "TODO: implement login" });
});

authRouter.post("/register", (_req, res) => {
  res.status(501).json({ message: "TODO: implement register" });
});
