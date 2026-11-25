import { Router } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/utils/validation";
import { ContestantController } from "@/modules/contestant";
import {
  ContestantIdShame,
  deleteContestantesSchema,
  CreateContestantSchema,
  UpdateContestantSchema,
  CreatesContestShema,
  ContestantMatchParamsSchema,
  ContestantDetailParamsSchema,
  GetContestantsInMatchQuerySchema,
  EliminatedContestantsFilterQuerySchema,
  RescueManySchema,
  AddStudentsToRescueSchema,
  RemoveStudentFromRescueSchema,
  UpdateToCompletedSchema,
  UpdateToEliminatedSchema,
} from "./contestant.schema";
import { authenticate, role } from "@/middlewares/auth";
const contestantRouter = Router();
// prive

contestantRouter.get(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  ContestantController.getAlls
);

contestantRouter.get(
  "/list-contestant/:slug/list",
  authenticate,
  role("Admin"),
  ContestantController.listContestant
);

// lấy tất cả thí sinh trong cuộc thi với nhóm
contestantRouter.get(
  "/contest/:slug/with-groups",
  authenticate,
  role("Admin"),
  ContestantController.getAllWithGroups
);

contestantRouter.get(
  "/not-contest/:slug",
  authenticate,
  role("Admin"),
  ContestantController.getAllNotConstest
);

contestantRouter.get(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestantIdShame),
  ContestantController.getById
);

// lấy thí sinh trong trận đấu
contestantRouter.get(
  "/:id/match/:matchId",
  authenticate,
  role("Admin"),
  validateParams(ContestantMatchParamsSchema),
  ContestantController.getByIdAndMatch
);

contestantRouter.post(
  "/contest/:slug",
  authenticate,
  role("Admin"),
  validateBody(CreateContestantSchema),
  ContestantController.create
);

contestantRouter.post(
  "/bulk/contest/:slug",
  authenticate,
  role("Admin"),
  validateBody(CreatesContestShema),
  ContestantController.creates
);

contestantRouter.patch(
  "/:id",
  authenticate,
  role("Admin"),
  validateBody(UpdateContestantSchema),
  validateParams(ContestantIdShame),
  ContestantController.update
);

contestantRouter.delete(
  "/:id",
  authenticate,
  role("Admin"),
  validateParams(ContestantIdShame),
  ContestantController.delete
);

contestantRouter.post(
  "/delete-many",
  authenticate,
  role("Admin"),
  validateBody(deleteContestantesSchema),
  ContestantController.deletes
);

// lấy thông tin thí sinh với nhóm trong trận đấu hiện tại
contestantRouter.get(
  "/:id/contest/:slug/match/:matchId/with-groups",
  authenticate,
  role("Admin"),
  validateParams(ContestantDetailParamsSchema),
  ContestantController.getDetailWithGroups
);

// lấy danh sách thí sinh trong trận đấu theo slug cuộc thi và id trận đấu
contestantRouter.get(
  "/contest/:slug/match/:matchId/contestants",
  authenticate,
  role("Admin"),
  validateQuery(GetContestantsInMatchQuerySchema),
  ContestantController.getContestantsInMatch
);

/**==================================CỨU TRỢ========================================== */
// API cứu trợ: lấy danh sách thí sinh bị loại theo tiêu chí cứu trợ
contestantRouter.get(
  "/rescue-candidates/:matchId",
  authenticate,
  role("Admin"),
  ContestantController.getRescueCandidates
);

// API cứu trợ: cập nhật cứu trợ hàng loạt
contestantRouter.post(
  "/rescue-candidates/:matchId/rescue-many",
  authenticate,
  role("Admin"),
  validateBody(RescueManySchema),
  ContestantController.rescueMany
);

// API lấy danh sách thí sinh bị loại trong 1 trận đấu không có phân trang, lọc, tìm kiếm
contestantRouter.get(
  "/eliminated/:matchId",
  authenticate,
  role("Admin"),
  ContestantController.getEliminatedContestants
);

// API lấy danh sách thí sinh bị loại có phân trang, lọc, tìm kiếm
contestantRouter.get(
  "/eliminated/:matchId/list",
  authenticate,
  role("Admin"),
  validateQuery(EliminatedContestantsFilterQuerySchema),
  ContestantController.getEliminatedContestantsWithFilter
);

// API lấy danh sách thí sinh đã được cứu trợ theo rescueId
contestantRouter.get(
  "/rescued/:rescueId",
  authenticate,
  role("Admin"),
  ContestantController.getRescuedContestantsByRescueId
);

// API thêm hàng loạt studentIds vào rescue (push, không trùng lặp)
contestantRouter.post(
  "/rescue/add-students",
  authenticate,
  role("Admin"),
  validateBody(AddStudentsToRescueSchema),
  ContestantController.addStudentsToRescue
);

// API xóa 1 studentId khỏi rescue
contestantRouter.delete(
  "/rescue/remove-student",
  authenticate,
  role("Admin"),
  validateBody(RemoveStudentFromRescueSchema),
  ContestantController.removeStudentFromRescue
);

// API cập nhật trạng thái thành completed cho các thí sinh trong trận đấu
contestantRouter.get(
  "/advance-candidates/:matchId/list",
  authenticate,
  role("Admin"),
  validateQuery(EliminatedContestantsFilterQuerySchema),
  ContestantController.getAdvanceCandidatesWithFilter
);

contestantRouter.get(
  "/advance-guard/:matchId",
  authenticate,
  role("Admin"),
  ContestantController.advanceGuard
);

contestantRouter.put(
  "/update-to-completed/:matchId",
  authenticate,
  role("Admin"),
  validateBody(UpdateToCompletedSchema),
  ContestantController.updateToCompleted
);

// API cập nhật trạng thái thành eliminated cho các thí sinh trong trận đấu (từ completed về eliminated)
contestantRouter.put(
  "/update-to-eliminated/:matchId",
  authenticate,
  role("Admin"),
  validateBody(UpdateToEliminatedSchema),
  ContestantController.updateToEliminated
);

// API lấy danh sách thí sinh ứng cử viên cứu trợ (chỉ lấy dữ liệu, không cập nhật bảng rescue)
contestantRouter.get(
  "/candidates-list/:matchId",
  authenticate,
  role("Admin"),
  ContestantController.getCandidatesList
);

// API lấy danh sách thí sinh đã hoàn thành (completed) trong trận đấu
contestantRouter.get(
  "/completed-contestants/:matchId",
  authenticate,
  role("Admin"),
  ContestantController.getCompletedContestants
);

// API cập nhật tất cả thí sinh completed về eliminated trong trận đấu
contestantRouter.put(
  "/update-all-completed-to-eliminated/:matchId",
  authenticate,
  role("Admin"),
  ContestantController.updateAllCompletedToEliminated
);

export { contestantRouter };
