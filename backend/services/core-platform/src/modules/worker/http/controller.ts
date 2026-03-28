import type { NextFunction, Request, Response } from "express";
import { UnauthorisedError } from "@infra/shared-errors";
import type { WorkerService } from "../application/service.js";
import {
  updateWorkerSchema,
  workerPathParamsSchema,
} from "../contracts/validators.js";
import { workerToJson } from "../contracts/dto.js";

export function createWorkerController(deps: { workerService: WorkerService }) {
  const { workerService } = deps;

  return {
    getWorker: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { workerId } = workerPathParamsSchema.parse(req.params);
        const worker = await workerService.getWorker(workerId, req.user);
        res.status(200).json({ data: workerToJson(worker) });
      } catch (err) {
        next(err);
      }
    },

    updateWorker: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.user) {
          next(new UnauthorisedError("Authentication required."));
          return;
        }
        const { workerId } = workerPathParamsSchema.parse(req.params);
        const body = updateWorkerSchema.parse(req.body);
        const worker = await workerService.updateWorkerProfile(workerId, body, req.user);
        res.status(200).json({ data: workerToJson(worker) });
      } catch (err) {
        next(err);
      }
    },
  };
}
