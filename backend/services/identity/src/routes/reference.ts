import { Router } from "express";
import { createRateLimiter } from "../security/index.js";
import { parseOrThrow, UkCompanyLookupQuerySchema } from "../security/validators.js";
import { lookupUkCompanies } from "../reference/ukCompanyLookup.service.js";
import { listReferenceCountries } from "../reference/countries.service.js";

export const referenceRouter = Router();

referenceRouter.get(
  "/uk-companies",
  createRateLimiter("referenceUkCompanies"),
  async (req, res, next) => {
    try {
      const input = parseOrThrow(UkCompanyLookupQuerySchema, req.query);
      const items = await lookupUkCompanies(input.q);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  },
);

referenceRouter.get(
  "/countries",
  createRateLimiter("referenceCountries"),
  async (_req, res, next) => {
    try {
      const items = await listReferenceCountries();
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  },
);
