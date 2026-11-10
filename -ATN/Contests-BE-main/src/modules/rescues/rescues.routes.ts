import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { RescuesController } from "@/modules/rescues";
import {
  RescuesIdShame,
  CreateRescuesShema,
  UpdateRescuesShema,
  deleteRescuesesSchema,
  SupportAnswerSchema,
  UpdateRescueStatusSchema,
} from "./rescues.schema";
import { authenticate, role } from "@/middlewares/auth";

const rescueRoute = Router();

rescueRoute.get("/match/:slug/:id", RescuesController.getRescueByMatchSlug);

rescueRoute.get(
  "/list-lifelineUsed/:slug",
  authenticate,
  role("Admin"),
  RescuesController.getListRescue
);

rescueRoute.get(
  "/list-all/:slug",
  authenticate,
  role("Admin"),
  RescuesController.getAllRescues
);

rescueRoute.get("/chart/:id", RescuesController.RescueChart);

rescueRoute.post(
  "/supportAnswer/:id",
  validateBody(SupportAnswerSchema),
  RescuesController.UpdateSupportAnswers
);

rescueRoute.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateRescuesShema),
  RescuesController.update
);

rescueRoute.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  // validateQuery(RescuesQuerySchema),
  RescuesController.getAlls
);

rescueRoute.get(
  "/enum/type",
  authenticate,
  role("Admin"),
  RescuesController.enmuResceType
);

rescueRoute.get(
  "/enum/status",
  authenticate,
  role("Admin"),
  RescuesController.enmuRescueStatus
);

rescueRoute.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RescuesIdShame),
  RescuesController.getById
);

rescueRoute.post(
  "/",
  authenticate,
  role("Admin"),
  validateBody(CreateRescuesShema),
  RescuesController.create
);

rescueRoute.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateRescuesShema),
  validateParams(RescuesIdShame),
  RescuesController.update
);

rescueRoute.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(RescuesIdShame),
  RescuesController.delete
);

rescueRoute.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteRescuesesSchema),
  RescuesController.deleteMany
);

// GET /rescues/match/:matchId - Lấy danh sách rescue theo matchId và rescueType
rescueRoute.get(
  "/match/:matchId",
  RescuesController.getRescuesByMatchIdAndType
);

rescueRoute.post(
  "/update-status-by-question",
  authenticate,
  role("Admin"),
  validateBody(UpdateRescueStatusSchema),
  RescuesController.updateRescueStatusByCurrentQuestion
);

export { rescueRoute };
