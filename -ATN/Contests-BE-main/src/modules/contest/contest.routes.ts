import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ContestController } from "@/modules/contest";
import {
  ContestsQuerySchema,
  ContestsIdShame,
  deleteContestsesSchema,
  UpdateContestsSchema,
  CreateContestsSchema,
} from "./contest.schema";
import { authenticate, role } from "@/middlewares/auth";
const contestRoute = Router();

// // // private

contestRoute.get(
  "/",
  authenticate,
  role("Admin"),
  validateQuery(ContestsQuerySchema),
  ContestController.getAlls
);

contestRoute.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestsIdShame),
  ContestController.getById
);

contestRoute.get(
  "/not-conest/:slug",
  authenticate,
  role("Admin"),
  ContestController.ListContestNotSlug
);

contestRoute.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateContestsSchema),
  ContestController.create
);

contestRoute.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateContestsSchema),
  validateParams(ContestsIdShame),
  ContestController.update
);

contestRoute.patch(
  "/:id/toggle-active",
  authenticate,
  role("Admin"),
  validateParams(ContestsIdShame),
  ContestController.toggle
);

contestRoute.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestsIdShame),
  ContestController.delete
);

contestRoute.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteContestsesSchema),
  ContestController.deleteMany
);

// Judge ;

contestRoute.get(
  "/list-contest/judge",
  authenticate,
  role("Judge"),
  ContestController.getListContestByJudgeId
);

export { contestRoute };
