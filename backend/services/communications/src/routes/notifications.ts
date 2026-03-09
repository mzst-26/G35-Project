import { Router } from "express";

export const notificationsRouter = Router();

notificationsRouter.post("/send", (_req, res) => {
  res.status(501).json({ message: "TODO: implement sms/email/in-app notification dispatch" });
});
