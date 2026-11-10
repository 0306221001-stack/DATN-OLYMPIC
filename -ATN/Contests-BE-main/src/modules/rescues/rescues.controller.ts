import { Request, Response } from "express";
import {
  RescuesQueryInput,
  RescueService,
  CreateRescueInput,
  UpdateRescueInput,
} from "@/modules/rescues";
import { logger } from "@/utils/logger";
import { errorResponse, successResponse } from "@/utils/response";
import { RescueStatus, RescueType, Match } from "@prisma/client";
import prisma from "@/config/client";
import { MatchService } from "../match";
import string from "zod";
import { count } from "console";
export default class RescueController {
  static async getAlls(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;

      if (!slug) {
        throw new Error("Slug không được để trống");
      }

      const contest = await prisma.contest.findUnique({
        where: { slug: slug },
      });

      if (!contest) {
        throw new Error("Không tìm thấy cuộc thi ");
      }
      const query: RescuesQueryInput = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        search: (req.query.search as string) || undefined,
        matchId: parseInt(req.query.contestId as string) || undefined,
        status: req.query.status as RescueStatus | undefined,
        rescueType: req.query.rescueType as RescueType | undefined,
      };
      const data = await RescueService.getAll(query, contest.id);
      if (!data) {
        throw new Error("Không tìm thấy cứu trợ ");
      }
      logger.info(`Lấy danh sách cứu trợ thành công`);
      res.json(
        successResponse(
          { rescues: data.rescues, pagination: data.pagination },
          "Lấy danh sách cứu trợ  thành công"
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Rescue = await RescueService.getRescueBy({ id: Number(id) });
      if (!Rescue) {
        throw new Error("Không tìm thấy cứu trợ ");
      }
      logger.info(`Lấy thông tin cứu trợ ${Rescue.name} thành công`);
      res.json(
        successResponse(
          Rescue,
          `Lấy thông tin cứu trợ ${Rescue.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateRescueInput = req.body;
      const match = await prisma.match.findFirst({
        where: { id: input.matchId },
      });
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      const Rescue = await RescueService.create(input);
      if (!Rescue) {
        throw new Error(`Thêm cứu trợ ${input.name} thành công`);
      }
      logger.info(`Thêm cứu trợ ${input.name} thành công`);
      res.json(
        successResponse(Rescue, `Thêm cứu trợ ${input.name} thành công`)
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const Rescue = await RescueService.getRescueBy({ id: Number(id) });
      if (!Rescue) {
        throw new Error("Không tìm thấy cứu trợ ");
      }

      const deleteRescue = await RescueService.delete(Rescue.id);
      if (!deleteRescue) {
        throw new Error(`Xóa cứu trợ ${Rescue.name} thất bại `);
      }
      logger.info(`Xóa cứu trợ ${Rescue.name} thành công`);
      res.json(successResponse(null, `Xóa cứu trợ ${Rescue.name} thành công`));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const input: UpdateRescueInput = req.body;
      const match = await prisma.match.findFirst({
        where: { id: input.matchId },
      });
      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }
      const Rescue = await RescueService.getRescueBy({ id: Number(id) });
      if (!Rescue) {
        throw new Error("Không tìm thấy cứu trợ ");
      }
      const updateRescue = await RescueService.updateRescue(Number(id), input);
      if (!updateRescue) {
        throw new Error("Cập nhật cứu trợ thất bại");
      }
      logger.info(`Cập nhật vòng thi  ${Rescue.name} thành công`);
      res.json(
        successResponse(
          updateRescue,
          `Cập nhật vòng thi ${Rescue.name} thành công`
        )
      );
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async deleteMany(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        throw new Error("Danh sách không hợp lệ");
      }

      const messages: { status: "success" | "error"; msg: string }[] = [];

      for (const id of ids) {
        const Rescue = await RescueService.getRescueBy({ id: Number(id) });

        if (!Rescue) {
          messages.push({
            status: "error",
            msg: `Không tìm thấy cứu trợ với ID = ${id}`,
          });
          continue;
        }

        const deleted = await RescueService.delete(Rescue.id);

        if (!deleted) {
          messages.push({
            status: "error",
            msg: `Xóa vòng đấu "${Rescue.name}" thất bại`,
          });
          continue;
        }

        messages.push({
          status: "success",
          msg: `Xóa vòng đấu "${Rescue.name}" thành công`,
        });
        logger.info(`Xóa vòng đấu "${Rescue.name}" thành công`);
      }

      res.json({
        success: true,
        messages,
      });
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  static async enmuResceType(req: Request, res: Response): Promise<void> {
    const rescueTypes = Object.values(RescueType); // Lấy các giá trị enum
    res.json({
      success: true,
      data: rescueTypes,
    });
  }

  static async enmuRescueStatus(req: Request, res: Response): Promise<void> {
    const rescueTypes = Object.values(RescueStatus); // Lấy các giá trị enum
    res.json({
      success: true,
      data: rescueTypes,
    });
  }

  static async getRescueByMatchSlug(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { slug, id } = req.params;

      if (!slug) {
        throw new Error("Slug không được để trống");
      }

      if (!id) {
        throw new Error("Match ID không hợp lệ");
      }

      const match = await MatchService.getMatchBy({
        slug: slug,
      });

      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      const rescuese = await RescueService.getRescueBy({
        id: Number(id),
        rescueType: "lifelineUsed",
      });

      if (!rescuese) {
        throw new Error("Không tìm thấy cứu trợ cho trận đấu này");
      }

      if (rescuese.questionOrder === null) {
        throw new Error("Cứu trợ không hợp lệ");
      }

      const currentQuestion = await MatchService.CurrentQuestion(
        rescuese.questionOrder,
        match.questionPackageId
      );

      if (!currentQuestion) {
        throw new Error("Câu hỏi hiện tại không hợp lệ");
      }

      const question = {
        id: currentQuestion.id,
        content: currentQuestion.content,
        options: currentQuestion.options,
        questionType: currentQuestion.questionType,
        questionTopic: currentQuestion.questionTopic?.name || null,
        questionMedia: currentQuestion.questionMedia || null,
        // Trang khán giả là công khai: câu trắc nghiệm không cần đáp án nên không gửi,
        // câu tự luận cần các chữ cái của đáp án để tạo ô xếp chữ.
        correctAnswer:
          currentQuestion.questionType === "multiple_choice"
            ? ""
            : currentQuestion.correctAnswer,
      };
      logger.info(`Lấy danh sách cứu trợ cho trận đấu ${id} thành công`);
      res.json(successResponse(question, "Lấy danh sách cứu trợ thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async RescueChart(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new Error("Rescue ID không hợp lệ");
      }

      const rescuese = await RescueService.getRescueBy({
        id: Number(id),
        rescueType: "lifelineUsed",
      });

      if (!rescuese) {
        throw new Error("Không tìm thấy cứu trợ cho trận đấu này");
      }

      // Kiểm tra và đảm bảo supportAnswers là mảng
      const supportAnswers = Array.isArray(rescuese.supportAnswers)
        ? rescuese.supportAnswers
        : [];

      if (supportAnswers.length === 0) {
        throw new Error("Không có câu trả lời hỗ trợ nào cho cứu trợ này");
      }

      const data = Object.entries(
        supportAnswers.reduce((acc: Record<string, number>, curr: string) => {
          acc[curr] = (acc[curr] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([label, value]) => ({ label, value }));

      logger.info(`Lấy data cứu trợ cho trận đấu ${id} thành công`);
      res.json(successResponse(data, "Lấy data cứu trợ thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  static async UpdateSupportAnswers(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;

      const input: UpdateRescueInput = req.body;

      if (!id) {
        throw new Error("Match ID không hợp lệ");
      }

      // Thêm phiếu bằng một câu lệnh nguyên tử, chỉ khi đợt cứu trợ đang mở:
      // nhiều khán giả gửi cùng lúc không bị mất phiếu và không cần hàng đợi.
      const appended = await prisma.$executeRaw`
        UPDATE rescues
        SET supportAnswers = JSON_ARRAY_APPEND(
          CASE WHEN JSON_TYPE(supportAnswers) = 'ARRAY' THEN supportAnswers ELSE '[]' END,
          '$', ${input.supportAnswers}
        )
        WHERE id = ${Number(id)} AND status = 'proposed'
      `;

      if (appended === 0) {
        const rescuese = await RescueService.getRescueBy({ id: Number(id) });
        if (!rescuese) {
          throw new Error("Không tìm thấy cứu trợ cho trận đấu này");
        }
        if (rescuese.status === "notUsed") {
          throw new Error("Chưa mở bình chọn, vui lòng chờ Ban tổ chức");
        }
        throw new Error("Đã hết lượt cứu trợ");
      }

      logger.info(`Cứu trợ thành công`);
      res.json(successResponse(null, "Cứu trợ thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }

  // API: Lấy danh sách rescue theo matchId và rescueType (mặc định 'resurrected')
  static async getRescuesByMatchIdAndType(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId);
      const rescueType = (req.query.rescueType as string) || "resurrected";

      if (isNaN(matchId)) {
        res.status(400).json({
          message: "Invalid matchId parameter",
        });
        return;
      }

      const rescues = await RescueService.getRescuesByMatchIdAndType(
        matchId,
        rescueType
      );

      res.status(200).json({
        message: "Rescues retrieved successfully",
        data: rescues,
      });
    } catch (error) {
      console.error("Error in getRescuesByMatchIdAndType:", error);
      res.status(500).json({
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error : {},
      });
    }
  }

  /**
   * API cập nhật trạng thái rescue dựa trên câu hỏi hiện tại
   */
  static async updateRescueStatusByCurrentQuestion(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { matchId, currentQuestionOrder } = req.body;

      const result = await RescueService.updateRescueStatusByCurrentQuestion(
        matchId,
        currentQuestionOrder
      );

      res.json({
        success: true,
        message: `Cập nhật trạng thái rescue thành công. Tổng cộng ${result.totalUpdated} rescue được cập nhật.`,
        data: {
          rescues: result.updatedRescues,
          currentEligible: result.currentEligibleRescues,
          summary: result.summary,
          currentQuestionOrder,
        },
      });
    } catch (error) {
      logger.error("Error in updateRescueStatusByCurrentQuestion:", error);
      res.status(500).json({
        success: false,
        message:
          (error as Error).message ||
          "Lỗi server khi cập nhật trạng thái rescue",
      });
    }
  }

  // Lấy danh sách rescue theo matchId và rescueType là "lifelineUsed"
  static async getListRescue(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;

      const match = await prisma.match.findFirst({
        where: { slug: slug },
      });

      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      const rescues = await RescueService.getListRescue(match.id);

      logger.info(`Lấy danh sách cứu trợ cho trận đấu ${match.id} thành công`);
      res.json(successResponse(rescues, "Lấy danh sách cứu trợ thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
  // Lấy danh sách rescue theo matchId với tất cả rescueType
  static async getAllRescues(req: Request, res: Response): Promise<void> {
    try {
      const slug = req.params.slug;
      const { currentQuestionOrder } = req.query;

      const questionOrder = currentQuestionOrder ? Number(currentQuestionOrder) : undefined;

      const match = await prisma.match.findFirst({
        where: { slug: slug },
      });

      if (!match) {
        throw new Error("Không tìm thấy trận đấu");
      }

      const rescues = await RescueService.getAllRescue(match.id, questionOrder);

      // if (!rescues || rescues.length === 0) {
      //   throw new Error("Không tìm thấy cứu trợ cho trận đấu này");
      // }
      // Thay vì throw error, trả về mảng rỗng
      const result = rescues || [];

      logger.info(`Lấy danh sách cứu trợ cho trận đấu ${match.id} thành công`);
      res.json(successResponse(result, "Lấy danh sách cứu trợ thành công"));
    } catch (error) {
      logger.error((error as Error).message);
      res.status(400).json(errorResponse((error as Error).message));
    }
  }
}
