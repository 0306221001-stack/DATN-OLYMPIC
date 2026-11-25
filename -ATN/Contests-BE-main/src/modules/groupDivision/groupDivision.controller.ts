import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { prisma } from "@/config/database";
import GroupDivisionService from "./groupDivision.service";
import { exportExcel } from "../../utils/Excel";
import {
  divideGroupsSchema,
  getAvailableContestantsSchema,
  getAvailableJudgesSchema,
  assignContestantsToGroupsSchema,
} from "./groupDivision.schema";

export default class GroupDivisionController {
  /**
   * Lấy danh sách thí sinh có thể tham gia trận đấu
   */
  static async getAvailableContestants(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const query = getAvailableContestantsSchema.parse({
        roundId: req.query.roundId
          ? parseInt(req.query.roundId as string)
          : undefined,
        status: req.query.status as any,
        schoolId: req.query.schoolId
          ? parseInt(req.query.schoolId as string)
          : undefined,
        classId: req.query.classId
          ? parseInt(req.query.classId as string)
          : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      });

      const data = await GroupDivisionService.getAvailableContestants(
        matchId,
        query
      );

      logger.info(`Lấy danh sách thí sinh cho trận đấu ${matchId} thành công`);
      res.json(successResponse(data, "Lấy danh sách thí sinh thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách trọng tài có thể chấm thi
   */
  static async getAvailableJudges(req: Request, res: Response): Promise<void> {
    try {
      const query = getAvailableJudgesSchema.parse({
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      });

      const data = await GroupDivisionService.getAvailableJudges(query);

      logger.info("Lấy danh sách trọng tài thành công");
      res.json(successResponse(data, "Lấy danh sách trọng tài thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách nhóm hiện tại của trận đấu
   */
  static async getCurrentGroups(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const groups = await GroupDivisionService.getCurrentGroups(matchId);

      logger.info(`Lấy danh sách nhóm cho trận đấu ${matchId} thành công`);
      res.json(successResponse({ groups }, "Lấy danh sách nhóm thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Chia nhóm thí sinh cho trận đấu
   */
  static async divideGroups(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const input = divideGroupsSchema.parse(req.body);

      const result = await GroupDivisionService.divideGroups(matchId, input);

      logger.info(`Chia nhóm cho trận đấu ${matchId} thành công`);
      res.json(successResponse({ groups: result }, "Chia nhóm thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách trường học để lọc
   */
  static async getSchools(req: Request, res: Response): Promise<void> {
    try {
      const schools = await GroupDivisionService.getSchools();

      logger.info("Lấy danh sách trường học thành công");
      res.json(
        successResponse({ schools }, "Lấy danh sách trường học thành công")
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách lớp học theo trường
   */
  static async getClassesBySchool(req: Request, res: Response): Promise<void> {
    try {
      const schoolId = parseInt(req.params.schoolId);
      if (!schoolId) {
        throw new Error("School ID không hợp lệ");
      }

      const classes = await GroupDivisionService.getClassesBySchool(schoolId);

      logger.info(`Lấy danh sách lớp học cho trường ${schoolId} thành công`);
      res.json(
        successResponse({ classes }, "Lấy danh sách lớp học thành công")
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getContestantByJudgeIdAndMatchId(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const slug = req.params.match;

      if (!slug) {
        throw new Error("Slug không hợp lệ");
      }

      const match = await prisma.match.findUnique({
        where: { slug: slug },
      });

      if (!match) {
        throw new Error("Không tìm thấy trân đấu");
      }

      if (!req.user || !req.user.userId) {
        throw new Error("Người dùng không hợp lệ");
      }

      const contestant =
        await GroupDivisionService.getContestantByJudgeIdAndMatchId(
          req.user.userId,
          match.id
        );

      if (!contestant) {
        throw new Error("Không tìm thấy thí sinh cho trọng tài này");
      }

      logger.info(
        `Lấy thí sinh cho trọng tài ${req.user.userId} trong trận đấu ${slug} thành công`
      );
      res.json(
        successResponse(
          contestant,
          `Lấy thí sinh cho trọng tài ${req.user.userId} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Lấy danh sách nhóm hiện tại của trận đấu (không sắp xếp - dành cho frontend)
   */
  static async getCurrentGroupsUnsorted(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      const groups = await GroupDivisionService.getCurrentGroupsUnsorted(
        matchId
      );

      logger.info(
        `Lấy danh sách nhóm không sắp xếp cho trận đấu ${matchId} thành công`
      );
      res.json(successResponse({ groups }, "Lấy danh sách nhóm thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Tạo nhóm mới trong trận đấu
   */
  static async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const { groupName, judgeId } = req.body;

      if (!matchId) {
        throw new Error("Match ID không hợp lệ");
      }

      if (!groupName) {
        throw new Error("Tên nhóm là bắt buộc");
      }

      // judgeId có thể undefined
      const newGroup = await GroupDivisionService.createGroup(
        matchId,
        groupName,
        judgeId // có thể undefined
      );

      logger.info(`Tạo nhóm ${groupName} cho trận đấu ${matchId} thành công`);
      res.json(successResponse(newGroup, "Tạo nhóm thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Xóa nhóm
   */
  static async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.groupId);

      if (!groupId) {
        throw new Error("Group ID không hợp lệ");
      }

      const result = await GroupDivisionService.deleteGroup(groupId);

      const message =
        result.deletedContestantsCount > 0
          ? `Xóa nhóm và ${result.deletedContestantsCount} thí sinh thành công`
          : "Xóa nhóm thành công";

      logger.info(`Xóa nhóm ${groupId} thành công`);
      res.json(successResponse(result, message));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Xóa nhiều nhóm cùng lúc
   */
  static async deleteAllGroups(req: Request, res: Response): Promise<void> {
    try {
      const { groupIds } = req.body;

      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        throw new Error("Danh sách ID nhóm không hợp lệ");
      }

      const result = await GroupDivisionService.deleteAllGroups(groupIds);

      const message = `Xóa ${result.deletedGroupsCount} nhóm và ${result.deletedContestantsCount} thí sinh thành công`;

      logger.info(`Xóa ${result.deletedGroupsCount} nhóm thành công`);
      res.json(successResponse(result, message));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Cập nhật tên nhóm
   */
  static async updateGroupName(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.groupId);
      const { name } = req.body;

      if (!groupId) {
        throw new Error("Group ID không hợp lệ");
      }

      if (!name || !name.trim()) {
        throw new Error("Tên nhóm là bắt buộc");
      }

      const updatedGroup = await GroupDivisionService.updateGroupName(
        groupId,
        name.trim()
      );

      logger.info(`Cập nhật tên nhóm ${groupId} thành công`);
      res.json(successResponse(updatedGroup, "Cập nhật tên nhóm thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  /**
   * Phân bổ thí sinh vào các nhóm đã có sẵn (theo groupId, contestantIds)
   */
  static async assignContestantsToGroups(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      if (!matchId) throw new Error("Match ID không hợp lệ");
      const input = assignContestantsToGroupsSchema.parse(req.body);
      await GroupDivisionService.assignContestantsToGroups(matchId, input);
      res.json(successResponse(null, "Phân bổ thí sinh vào nhóm thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async ExportExcel(req: Request, res: Response): Promise<void> {
    try {
      const matchId = req.body.matchId;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
          id: true,
          slug: true,
        },
      });
      if (!match) {
        throw new Error("Trận đấu không tồn tại");
      }
      const raw = await GroupDivisionService.ExportExcel(matchId);

      const data = raw.map((item, index) => ({
        "Số thứ tự": index + 1,
        "Họ và tên": item.contestant.student.fullName,
        "Mã sinh viên": item.contestant.student.studentCode,
        "Số báo danh": item.registrationNumber,
        "Trường học": item.contestant.student.class.school.name,
        "Lớp học": item.contestant.student.class.name,
      }));

      if (!data || data.length === 0) {
        throw new Error("Không có dữ liệu để xuất");
      }
      const fileName = match.slug || req.body.fileName;
      exportExcel(data, fileName, res);
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
