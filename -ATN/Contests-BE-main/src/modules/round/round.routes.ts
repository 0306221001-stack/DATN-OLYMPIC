import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { RoundController } from "@/modules/round";
import {
  RoundQuerySchema,
  RoundIdShame,
  CreateRoundSchema,
  UpdeateRoundhema,
  deleteRoundesSchema,
} from "./round.schema";
import { authenticate, role } from "@/middlewares/auth";
const roundRouter = Router();
// prive

roundRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  validateQuery(RoundQuerySchema),
  RoundController.getAlls
);

roundRouter.get(
  "/contest/:slug/get-round",
  authenticate,
  role("Admin"),
  validateQuery(RoundQuerySchema),
  RoundController.getListRound
);

roundRouter.get(
  "/list-round/:id",
  authenticate,
  role("Admin"),
  // validateQuery(RoundQuerySchema),
  RoundController.getRoundByContestId
);

roundRouter.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(RoundQuerySchema),
  RoundController.getAlls
);

roundRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RoundIdShame),
  RoundController.getRoundById
);

roundRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  RoundController.createRound
);

roundRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdeateRoundhema),
  validateParams(RoundIdShame),
  RoundController.updateRound
);

roundRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  RoundController.toggleActive
);
roundRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RoundIdShame),
  RoundController.deleteRound
);

roundRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteRoundesSchema),
  RoundController.deleteRounds
);

export { roundRouter };
