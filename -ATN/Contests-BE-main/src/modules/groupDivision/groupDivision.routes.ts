import { Router } from "express";
import GroupDivisionController from "./groupDivision.controller";
import { authenticate, role } from "@/middlewares/auth";

const router = Router();

// Tất cả routes đều yêu cầu authenticate
router.use(authenticate);

// Route cho Judge - lấy thí sinh theo judge và match
router.get(
  "/contestant/judge/:match",
  role("Judge"),
  GroupDivisionController.getContestantByJudgeIdAndMatchId
);

// Route cho Admin - lấy thí sinh theo judge và match
router.get(
  "/admin/contestant/judge/:match",
  role("Admin"),
  GroupDivisionController.getContestantByJudgeIdAndMatchId
);

// Các routes khác chỉ dành cho Admin
router.use(role("Admin"));

// Lấy danh sách thí sinh có thể tham gia trận đấu
router.get(
  "/matches/:matchId/contestants",
  GroupDivisionController.getAvailableContestants
);

// Lấy danh sách trọng tài có thể chấm thi
router.get("/judges", GroupDivisionController.getAvailableJudges);

// Lấy danh sách nhóm hiện tại của trận đấu
router.get(
  "/matches/:matchId/groups",
  GroupDivisionController.getCurrentGroups
);

// Lấy danh sách nhóm hiện tại của trận đấu (không sắp xếp - dành cho frontend)
router.get(
  "/matches/:matchId/groups/unsorted",
  GroupDivisionController.getCurrentGroupsUnsorted
);

// Chia nhóm thí sinh cho trận đấu
router.post(
  "/matches/:matchId/divide-groups",
  GroupDivisionController.divideGroups
);

// Tạo nhóm mới trong trận đấu
router.post("/matches/:matchId/groups", GroupDivisionController.createGroup);

// Xóa nhóm
router.delete("/groups/:groupId", GroupDivisionController.deleteGroup);

// Xóa nhiều nhóm cùng lúc
router.delete("/groups", GroupDivisionController.deleteAllGroups);

// Cập nhật tên nhóm
router.put("/groups/:groupId/name", GroupDivisionController.updateGroupName);

// Lấy danh sách trường học để lọc
router.get("/schools", GroupDivisionController.getSchools);

// Lấy danh sách lớp học theo trường
router.get(
  "/schools/:schoolId/classes",
  GroupDivisionController.getClassesBySchool
);

// Phân bổ thí sinh vào các nhóm đã có sẵn (theo groupId, contestantIds)
router.post(
  "/matches/:matchId/assign-contestants-to-groups",
  GroupDivisionController.assignContestantsToGroups
);

router.post("/export/excel", GroupDivisionController.ExportExcel);

export default router;
