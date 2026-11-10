import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { MatchController } from "@/modules/match";
import { MatchIdShame, deleteMatchesSchema } from "./match.schema";
import { authenticate, role } from "@/middlewares/auth";
const matchRouter = Router();
// private

//lấy danh sách trận đấu theo slug cuộc thi
matchRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  MatchController.getListMatch
);

matchRouter.get(
  "/:slug/matchInfo",
  authenticate,
  role("Admin", "Judge"),
  MatchController.matchInfo
);

matchRouter.get(
  "/:slug/bgContest",
  authenticate,
  role("Admin", "Judge"),
  MatchController.bgContest
);

matchRouter.get(
  "/:slug/CurrentQuestion",
  authenticate,
  role("Admin", "Judge"),
  MatchController.CurrentQuestion
);

matchRouter.get(
  "/:slug/ListRescues",
  authenticate,
  role("Admin"),
  MatchController.ListRescues
);

matchRouter.get(
  "/:slug/ListContestant",
  authenticate,
  role("Admin", "Judge"),
  MatchController.ListContestant
);

matchRouter.get(
  "/:slug/countContestant",
  authenticate,
  role("Admin"),
  MatchController.countContestant
);

matchRouter.get(
  "/:slug/ListQuestion",
  authenticate,
  role("Admin"),
  MatchController.ListQuestion
);

matchRouter.get(
  "/:slug/ScreenControl",
  authenticate,
  role("Admin"),
  MatchController.ScreenControl
);

matchRouter.get(
  "/contest/:slug/all",
  authenticate,
  role("Admin"),
  // validateQuery(MatchQuerySchema),
  MatchController.getAlls
);

matchRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MatchIdShame),
  MatchController.getById
);

matchRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  // validateBody(CreateMatchSchema),
  MatchController.create
);

matchRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MatchIdShame),
  MatchController.update
);

matchRouter.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  MatchController.toggleActive
);
matchRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(MatchIdShame),
  MatchController.delete
);

matchRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteMatchesSchema),
  MatchController.deletes
);

//  Judge routes

matchRouter.get(
  "/judge/:id",
  authenticate,
  role("Judge"),
  MatchController.getListMatchByJudgeId
);

export { matchRouter };
