import { PrismaClient } from "@prisma/client";
import { logger } from "@/utils/logger";
import { CustomError } from "@/middlewares/errorHandler";
import { ERROR_CODES } from "@/constants/errorCodes";
import {
  CreateResultData,
  UpdateResultData,
  GetResultsQuery,
  ResultResponse,
  ResultListResponse,
  BatchDeleteResult,
  GetResultsByContestSlugQuery,
  SubmitAnswerData,
  SubmitAnswerResponse,
} from "./result.schema";
import { prisma } from "@/config/database";
import { timerEndedAt } from "@/socket/events/timer.event";
import { broadcastContestantStatus } from "@/socket/services/contestantStatus";

// Thời gian ân hạn sau khi đồng hồ về 0 cho đáp án app tự nộp lúc hết giờ.
const SUBMIT_GRACE_MS = 5000;

export class ResultService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get results with pagination and filtering
   */
  async getResults(query: GetResultsQuery): Promise<ResultListResponse> {
    try {
      const {
        page,
        limit,
        search,
        contestantId,
        matchId,
        isCorrect,
        questionOrder,
        sortBy,
        sortOrder,
      } = query;

      const skip = (page - 1) * limit;
      const where: any = {};

      // Apply filters
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
            },
          },
          {
            contestant: {
              student: {
                fullName: {
                  contains: search,
                },
              },
            },
          },
          {
            contestant: {
              student: {
                studentCode: {
                  contains: search,
                },
              },
            },
          },
        ];
      }

      if (contestantId) {
        where.contestantId = contestantId;
      }

      if (matchId) {
        where.matchId = matchId;
      }

      if (isCorrect !== undefined) {
        where.isCorrect = isCorrect;
      }

      if (questionOrder) {
        where.questionOrder = questionOrder;
      }

      // Get total count
      const total = await this.prisma.result.count({ where });

      // Get results
      const results = await this.prisma.result.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        results: results as ResultResponse[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error getting results:", error);
      throw new CustomError(
        "Lỗi khi lấy danh sách kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get result by ID
   */
  async getResultById(id: number): Promise<ResultResponse> {
    try {
      const result = await this.prisma.result.findUnique({
        where: { id },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!result) {
        throw new CustomError(
          "Kết quả không tìm thấy",
          404,
          ERROR_CODES.RESULT_NOT_FOUND
        );
      }

      return result as ResultResponse;
    } catch (error) {
      logger.error("Error getting result by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi lấy thông tin kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create new result
   */
  async createResult(data: CreateResultData): Promise<ResultResponse> {
    try {
      // Validate contestant exists
      const contestant = await this.prisma.contestant.findUnique({
        where: { id: data.contestantId },
      });
      if (!contestant) {
        throw new CustomError(
          "Contestant không tồn tại",
          404,
          ERROR_CODES.CONTESTANT_NOT_FOUND
        );
      }

      // Validate match exists
      const match = await this.prisma.match.findUnique({
        where: { id: data.matchId },
      });
      if (!match) {
        throw new CustomError(
          "Match không tồn tại",
          404,
          ERROR_CODES.MATCH_NOT_FOUND
        );
      }

      // Check if result already exists for this contestant, match, and question order
      const existingResult = await this.prisma.result.findFirst({
        where: {
          contestantId: data.contestantId,
          matchId: data.matchId,
          questionOrder: data.questionOrder,
        },
      });

      if (existingResult) {
        throw new CustomError(
          "Kết quả đã tồn tại cho contestant, match và question order này",
          409,
          ERROR_CODES.RESULT_ALREADY_EXISTS
        );
      }

      // Create result
      const result = await this.prisma.result.create({
        data: {
          contestantId: data.contestantId,
          matchId: data.matchId,
          isCorrect: data.isCorrect,
          questionOrder: data.questionOrder,
        },
        include: {
          contestant: {
            select: {
              id: true,
              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Result created successfully with ID: ${result.id}`);
      return result as ResultResponse;
    } catch (error) {
      logger.error("Error creating result:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi tạo kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update result (PATCH method)
   */
  async updateResult(
    id: number,
    data: UpdateResultData
  ): Promise<ResultResponse> {
    try {
      // Check if result exists
      const existingResult = await this.prisma.result.findUnique({
        where: { id },
      });
      if (!existingResult) {
        throw new CustomError(
          "Kết quả không tìm thấy",
          404,
          ERROR_CODES.RESULT_NOT_FOUND
        );
      }

      // Validate contestant if provided
      if (data.contestantId) {
        const contestant = await this.prisma.contestant.findUnique({
          where: { id: data.contestantId },
        });
        if (!contestant) {
          throw new CustomError(
            "Contestant không tồn tại",
            404,
            ERROR_CODES.CONTESTANT_NOT_FOUND
          );
        }
      }

      // Validate match if provided
      if (data.matchId) {
        const match = await this.prisma.match.findUnique({
          where: { id: data.matchId },
        });
        if (!match) {
          throw new CustomError(
            "Match không tồn tại",
            404,
            ERROR_CODES.MATCH_NOT_FOUND
          );
        }
      }

      // Check for duplicate if key fields are being updated
      if (data.contestantId || data.matchId || data.questionOrder) {
        const duplicateCheck = await this.prisma.result.findFirst({
          where: {
            contestantId: data.contestantId || existingResult.contestantId,
            matchId: data.matchId || existingResult.matchId,
            questionOrder: data.questionOrder || existingResult.questionOrder,
            id: { not: id }, // Exclude current result
          },
        });

        if (duplicateCheck) {
          throw new CustomError(
            "Kết quả đã tồn tại cho contestant, match và question order này",
            409,
            ERROR_CODES.RESULT_ALREADY_EXISTS
          );
        }
      }

      // Update result
      const result = await this.prisma.result.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.contestantId && { contestantId: data.contestantId }),
          ...(data.matchId && { matchId: data.matchId }),
          ...(data.isCorrect !== undefined && { isCorrect: data.isCorrect }),
          ...(data.questionOrder && { questionOrder: data.questionOrder }),
        },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Result updated successfully: ${result.id}`);
      return result as ResultResponse;
    } catch (error) {
      logger.error("Error updating result:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi cập nhật kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Hard delete result
   */
  async deleteResult(id: number): Promise<void> {
    try {
      // Check if result exists
      const existingResult = await this.prisma.result.findUnique({
        where: { id },
      });
      if (!existingResult) {
        throw new CustomError(
          "Kết quả không tìm thấy",
          404,
          ERROR_CODES.RESULT_NOT_FOUND
        );
      }

      // Hard delete result
      await this.prisma.result.delete({
        where: { id },
      });

      logger.info(`Result hard deleted: ${id}`);
    } catch (error) {
      logger.error("Error deleting result:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi xóa kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Batch delete results
   */
  async batchDeleteResults(ids: number[]): Promise<BatchDeleteResult> {
    const successIds: number[] = [];
    const failedIds: number[] = [];
    const errors: Array<{ id: number; error: string }> = [];

    try {
      for (const id of ids) {
        try {
          // Check if result exists
          const existingResult = await this.prisma.result.findUnique({
            where: { id },
          });

          if (!existingResult) {
            failedIds.push(id);
            errors.push({ id, error: "Result not found" });
            continue;
          }

          // Delete result
          await this.prisma.result.delete({
            where: { id },
          });

          successIds.push(id);
          logger.info(`Result ${id} deleted successfully in batch operation`);
        } catch (error) {
          failedIds.push(id);
          errors.push({
            id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          logger.error(`Error deleting result ${id} in batch:`, error);
        }
      }

      return {
        successIds,
        failedIds,
        errors,
        summary: {
          total: ids.length,
          success: successIds.length,
          failed: failedIds.length,
        },
      };
    } catch (error) {
      logger.error("Error in batch delete results:", error);
      throw new CustomError(
        "Lỗi khi xóa hàng loạt kết quả",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get results by contestant ID
   */
  async getResultsByContestant(
    contestantId: number
  ): Promise<ResultResponse[]> {
    try {
      const results = await this.prisma.result.findMany({
        where: { contestantId },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
            },
          },
        },
        orderBy: { questionOrder: "asc" },
      });

      return results as ResultResponse[];
    } catch (error) {
      logger.error("Error getting results by contestant:", error);
      throw new CustomError(
        "Lỗi khi lấy kết quả theo contestant",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get results by match ID
   */
  async getResultsByMatch(matchId: number): Promise<ResultResponse[]> {
    try {
      const results = await this.prisma.result.findMany({
        where: { matchId },
        include: {
          contestant: {
            select: {
              id: true,

              studentId: true,
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
            },
          },
        },
        orderBy: [{ contestantId: "asc" }, { questionOrder: "asc" }],
      });

      return results as ResultResponse[];
    } catch (error) {
      logger.error("Error getting results by match:", error);
      throw new CustomError(
        "Lỗi khi lấy kết quả theo match",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get statistics for a contestant
   */
  async getContestantStatistics(contestantId: number): Promise<{
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
  }> {
    try {
      const results = await this.prisma.result.findMany({
        where: { contestantId },
      });

      const totalQuestions = results.length;
      const correctAnswers = results.filter(r => r.isCorrect).length;
      const incorrectAnswers = totalQuestions - correctAnswers;
      const accuracy =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      return {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        accuracy: Math.round(accuracy * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      logger.error("Error getting contestant statistics:", error);
      throw new CustomError(
        "Lỗi khi lấy thống kê contestant",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get results by contest slug with pagination and filtering
   */
  async getResultsByContestSlug(
    slug: string,
    query: GetResultsByContestSlugQuery
  ): Promise<ResultListResponse> {
    try {
      const {
        page,
        limit,
        search,
        matchId,
        roundId,
        isCorrect,
        questionOrder,
        sortBy,
        sortOrder,
      } = query;

      const skip = (page - 1) * limit;

      // Tìm contest theo slug
      const contest = await this.prisma.contest.findUnique({
        where: { slug },
        select: { id: true, name: true },
      });

      if (!contest) {
        throw new CustomError(
          "Cuộc thi không tồn tại",
          404,
          ERROR_CODES.CONTEST_NOT_FOUND
        );
      }

      // Xây dựng điều kiện where
      const where: any = {
        contestant: {
          contestId: contest.id,
        },
      };

      // Apply filters
      if (search) {
        where.OR = [
          {
            contestant: {
              student: {
                fullName: {
                  contains: search,
                },
              },
            },
          },
          {
            contestant: {
              student: {
                studentCode: {
                  contains: search,
                },
              },
            },
          },
        ];
      }

      if (matchId) {
        where.matchId = matchId;
      }

      if (roundId) {
        where.match = {
          roundId: roundId,
        };
      }

      if (isCorrect !== undefined) {
        where.isCorrect = isCorrect;
      }

      if (questionOrder) {
        where.questionOrder = questionOrder;
      }

      // Get total count
      const total = await this.prisma.result.count({ where });

      // Build orderBy
      let orderBy: any = {};
      switch (sortBy) {
        case "contestant":
          orderBy = {
            contestant: {
              student: {
                fullName: sortOrder,
              },
            },
          };
          break;
        case "questionOrder":
          orderBy = { questionOrder: sortOrder };
          break;
        case "name":
          orderBy = { name: sortOrder };
          break;
        case "createdAt":
          orderBy = { createdAt: sortOrder };
          break;
        case "updatedAt":
          orderBy = { updatedAt: sortOrder };
          break;
        default:
          orderBy = { createdAt: sortOrder };
      }

      // Get results
      const results = await this.prisma.result.findMany({
        where,
        include: {
          contestant: {
            select: {
              id: true,
              studentId: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  studentCode: true,
                },
              },
            },
          },
          match: {
            select: {
              id: true,
              name: true,
              roundId: true,
              round: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        results: results as ResultResponse[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error getting results by contest slug:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Lỗi khi lấy danh sách kết quả theo cuộc thi",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Submit answer for student (API version of socket submit)
   */
  async submitAnswer(
    contestantId: number,
    data: SubmitAnswerData
  ): Promise<SubmitAnswerResponse> {
    try {
      // 1. Kiểm tra contestant tồn tại và trạng thái
      const contestant = await this.prisma.contestant.findUnique({
        where: { id: contestantId },
        select: {
          id: true,
          status: true,
          student: {
            select: { fullName: true, studentCode: true },
          },
        },
      });

      if (!contestant) {
        throw new CustomError(
          "Thí sinh không tồn tại",
          404,
          ERROR_CODES.CONTESTANT_NOT_FOUND
        );
      }

      // 2. 🚫 KIỂM TRA TRẠNG THÁI CONTESTANT_MATCH (eliminated/banned)
      const contestantMatch = await this.prisma.contestantMatch.findFirst({
        where: {
          contestantId: contestantId,
          matchId: data.matchId,
        },
      });

      // Thí sinh chưa được xếp vào trận (qua Nhóm) thì không được làm bài:
      // nếu cho qua, kết quả bị ghi nhưng trận không theo dõi được thí sinh
      // (không loại/cứu trợ được).
      if (!contestantMatch) {
        return {
          success: false,
          message:
            "Bạn chưa được xếp vào trận đấu này, vui lòng liên hệ Ban tổ chức",
        };
      }

      if (contestantMatch) {
        // 🚫 Chặn nếu chưa bắt đầu
        if (contestantMatch.status === "not_started") {
          return {
            success: false,
            message: "Trận đấu chưa bắt đầu, bạn chưa thể trả lời câu hỏi",
          };
        }

        // Chặn nếu đã bị eliminated
        if (contestantMatch.status === "eliminated") {
          return {
            success: false,
            message: `Bạn đã bị loại tại câu hỏi số ${
              contestantMatch.eliminatedAtQuestionOrder || "N/A"
            } và không thể tiếp tục trả lời`,
          };
        }

        // Chặn nếu đã bị banned
        if (contestantMatch.status === "banned") {
          return {
            success: false,
            message: "Bạn đã bị cấm tham gia trận đấu này do vi phạm quy định",
          };
        }
      }

      // 3. Kiểm tra match tồn tại và active
      const match = await this.prisma.match.findUnique({
        where: { id: data.matchId },
        include: {
          round: {
            include: {
              contest: true,
            },
          },
        },
      });

      if (!match) {
        throw new CustomError(
          "Trận đấu không tồn tại",
          404,
          ERROR_CODES.MATCH_NOT_FOUND
        );
      }

      if (match.status !== "ongoing") {
        return {
          success: false,
          message: "Trận đấu không đang diễn ra",
        };
      }

      // Chỉ nhận đáp án cho câu đang chiếu
      if (data.questionOrder !== match.currentQuestion) {
        return {
          success: false,
          message: "Câu hỏi này không còn nhận đáp án",
        };
      }

      // Hết giờ: chỉ nhận thêm trong thời gian ân hạn ngắn cho đáp án app tự nộp
      // lúc đồng hồ về 0, để không nộp được sau khi đã công bố đáp án.
      if (match.remainingTime === 0) {
        const endedAt = timerEndedAt.get(match.slug ?? "");
        if (endedAt && Date.now() - endedAt > SUBMIT_GRACE_MS) {
          return {
            success: false,
            message: "Đã hết thời gian trả lời câu hỏi này",
          };
        }
      }

      // 4. Lấy thông tin câu hỏi từ QuestionDetail
      const questionDetail = await this.prisma.questionDetail.findFirst({
        where: {
          questionPackageId: match.questionPackageId,
          questionOrder: data.questionOrder,
          isActive: true,
        },
        include: {
          question: true,
        },
      });

      if (!questionDetail) {
        throw new CustomError(
          "Câu hỏi không tồn tại",
          404,
          ERROR_CODES.QUESTION_NOT_FOUND
        );
      }

      // 5. Kiểm tra đã trả lời chưa
      const existingResult = await this.prisma.result.findFirst({
        where: {
          contestantId: contestantId,
          matchId: data.matchId,
          questionOrder: data.questionOrder,
        },
      });

      if (existingResult) {
        return {
          success: false,
          message: "Bạn đã trả lời câu hỏi này rồi",
          alreadyAnswered: true,
          result: {
            isCorrect: existingResult.isCorrect,
            questionOrder: existingResult.questionOrder,
            submittedAt: existingResult.createdAt.toISOString(),
            eliminated: (contestant.status as string) === "eliminate",
          },
        };
      }

      // 6. Kiểm tra đáp án đúng/sai
      let isCorrect = false;
      const question = questionDetail.question;

      // 🔧 XỬ LÝ: Trường hợp không chọn đáp án nào
      if (data.answer === "[KHÔNG CHỌN ĐÁP ÁN]") {
        isCorrect = false; // Luôn coi như sai
      } else {
        // 🔥 NEW: Logic kiểm tra cải tiến theo loại câu hỏi
        if (question.questionType === "multiple_choice") {
          // Câu hỏi trắc nghiệm: so sánh trực tiếp
          isCorrect =
            data.answer.toLowerCase() === question.correctAnswer?.toLowerCase();
        } else if (question.questionType === "essay") {
          // 🔥 NEW: Xử lý câu hỏi tự luận
          const studentAnswer = data.answer.toLowerCase().trim();

          // 🔥 NEW: Kiểm tra nếu học sinh gửi format option (có thể do lỗi UI)
          const optionPatterns = [
            /^option\s*[a-d]$/i, // "Option A", "option a", "OptionA"
            /^[a-d]$/i, // "A", "a", "B", "b"
            /^[a-d]\./i, // "A.", "a."
          ];

          const isOptionFormat = optionPatterns.some(pattern =>
            pattern.test(studentAnswer)
          );

          if (isOptionFormat) {
            // 🔥 NEW: Nếu học sinh gửi format option cho câu hỏi tự luận
            // Có thể do lỗi UI hoặc nhầm lẫn - xử lý nhẹ nhàng hơn
            console.warn(
              `⚠️ [API SUBMIT] Học sinh gửi format option "${data.answer}" cho câu hỏi tự luận. ContestantId: ${contestantId}`
            );

            // 🔥 OPTION 1: Coi như không trả lời (không bị loại ngay)
            isCorrect = false;
            // 🔥 OPTION 2: Có thể cho phép học sinh trả lời lại (cần thêm logic)
          } else {
            // 🔥 NEW: So sánh thông minh cho câu hỏi tự luận
            const correctAnswer =
              question.correctAnswer?.toLowerCase().trim() || "";

            // 🔥 NEW: Chuẩn hóa đáp án - loại bỏ ký tự đặc biệt và dấu câu
            const normalizeAnswer = (text: string): string => {
              // Bước 1: Loại bỏ khoảng trắng thừa và chuyển về lowercase
              let normalized = text.toLowerCase().trim();

              // Bước 2: Loại bỏ các ký tự đặc biệt ở đầu câu
              normalized = normalized.replace(/^[@#$%^&*+=|\\<>/`~]+/, "");

              // Bước 3: Tách và xử lý dấu chấm cuối câu
              let hasDot = false;
              if (normalized.endsWith(".")) {
                hasDot = true;
                normalized = normalized.slice(0, -1).trim();
              }

              // Bước 4: Loại bỏ các ký tự đặc biệt không phải dấu câu
              normalized = normalized.replace(/[@#$%^&*+=|\\<>/`~]/g, " ");

              // Bước 5: Chuẩn hóa khoảng trắng
              normalized = normalized.replace(/\s+/g, " ").trim();

              // Bước 6: Thêm lại dấu chấm cuối câu nếu có
              if (hasDot) {
                normalized = normalized + ".";
              }

              return normalized;
            };

            const normalizedStudentAnswer = normalizeAnswer(studentAnswer);
            const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);

            // So sánh bỏ qua dấu chấm cuối câu
            const compareWithoutEndDot = (a: string, b: string): boolean => {
              const stripDot = (s: string) =>
                s.endsWith(".") ? s.slice(0, -1) : s;
              return stripDot(a) === stripDot(b);
            };

            // So sánh trực tiếp sau khi chuẩn hóa
            if (
              compareWithoutEndDot(
                normalizedStudentAnswer,
                normalizedCorrectAnswer
              )
            ) {
              isCorrect = true;
            } else {
              // So sánh từng từ (giữ nguyên dấu câu giữa câu)
              const studentWords = normalizedStudentAnswer
                .split(/\s+/)
                .filter(word => word.length > 0);
              const correctWords = normalizedCorrectAnswer
                .split(/\s+/)
                .filter(word => word.length > 0);

              // So sánh từng từ và dấu câu
              if (studentWords.length === correctWords.length) {
                // Chỉ đúng khi tất cả các từ và dấu câu giữa câu đều giống nhau
                isCorrect = studentWords.every((word, index) => {
                  // Nếu là từ cuối cùng, bỏ qua dấu chấm
                  if (index === studentWords.length - 1) {
                    return compareWithoutEndDot(word, correctWords[index]);
                  }
                  // Các từ khác phải giống hệt nhau
                  return word === correctWords[index];
                });
              } else {
                isCorrect = false;
              }
            }
          }
        } else {
          // Fallback cho các loại câu hỏi khác
          isCorrect =
            data.answer.toLowerCase() === question.correctAnswer?.toLowerCase();
        }
      }

      // 7. Lưu kết quả vào database
      const result = await this.prisma.result.create({
        data: {
          contestantId: contestantId,
          matchId: data.matchId,
          isCorrect: isCorrect,
          questionOrder: data.questionOrder,
        },
        include: {
          contestant: {
            include: {
              student: {
                select: { fullName: true, studentCode: true },
              },
            },
          },
        },
      });

      // 8. Xử lý elimination nếu trả lời sai
      let isEliminated = false;
      if (!isCorrect) {
        let eliminationReason = "incorrect_answer"; // Default reason

        // 🔥 NEW: Phân biệt lý do elimination cụ thể hơn
        if (data.answer === "[KHÔNG CHỌN ĐÁP ÁN]") {
          eliminationReason = "no_answer_selected";
        } else if (question.questionType === "essay") {
          const studentAnswer = data.answer.toLowerCase().trim();
          const optionPatterns = [/^option\s*[a-d]$/i, /^[a-d]$/i, /^[a-d]\./i];
          const isOptionFormat = optionPatterns.some(pattern =>
            pattern.test(studentAnswer)
          );

          if (isOptionFormat) {
            eliminationReason = "essay_option_format_error"; // 🔥 NEW: Lý do cụ thể
          }
        }

        try {
          // Cập nhật trạng thái contestant thành eliminate
          await this.prisma.contestant.update({
            where: { id: contestantId },
            data: { status: "eliminate" },
          });

          // Cập nhật trạng thái contestant_match thành eliminated
          await this.prisma.contestantMatch.updateMany({
            where: {
              contestantId: contestantId,
              matchId: data.matchId,
            },
            data: {
              status: "eliminated",
              eliminatedAtQuestionOrder: data.questionOrder,
            },
          });

          isEliminated = true;
          void broadcastContestantStatus(data.matchId);

          // Tạo elimination log với lý do cụ thể
          try {
            await this.prisma.$executeRaw`
              INSERT INTO elimination_logs (contestant_id, question_order, elimination_reason, eliminated_at)
              VALUES (${contestantId}, ${data.questionOrder}, ${eliminationReason}, NOW())
            `;
          } catch (logError) {
            console.warn(
              "⚠️ [API SUBMIT] Không thể tạo elimination log:",
              logError
            );
          }
        } catch (eliminationError) {
          console.error(
            "💥 [API SUBMIT] Lỗi trong elimination logic:",
            eliminationError
          );
        }
      }

      // 9. Chuẩn bị response với thông báo phù hợp
      let responseMessage = "";
      if (isCorrect) {
        responseMessage = "Câu trả lời chính xác! ";
      } else if (data.answer === "[KHÔNG CHỌN ĐÁP ÁN]") {
        responseMessage = "Bạn không chọn đáp án nào và đã bị loại! ";
      } else if (question.questionType === "essay") {
        // 🔥 NEW: Thông báo đặc biệt cho câu hỏi tự luận
        const studentAnswer = data.answer.toLowerCase().trim();
        const optionPatterns = [/^option\s*[a-d]$/i, /^[a-d]$/i, /^[a-d]\./i];
        const isOptionFormat = optionPatterns.some(pattern =>
          pattern.test(studentAnswer)
        );

        if (isOptionFormat) {
          responseMessage =
            "⚠️ Phát hiện lỗi: Bạn đã gửi format lựa chọn cho câu hỏi tự luận. Vui lòng trả lời bằng văn bản! ";
        } else {
          responseMessage =
            "Câu trả lời tự luận không chính xác. Hãy kiểm tra lại nội dung! ";
        }
      } else {
        responseMessage = "Câu trả lời không chính xác 😔";
      }

      const response: SubmitAnswerResponse = {
        success: true,
        message: responseMessage, // 🔧 Thông báo phù hợp với từng trường hợp
        result: {
          isCorrect: isCorrect,
          questionOrder: data.questionOrder,
          submittedAt: result.createdAt.toISOString(),
          eliminated: isEliminated,
          score: isCorrect ? question.score : 0,
          correctAnswer: !isCorrect ? question.correctAnswer : undefined,
          explanation: !isCorrect
            ? question.explanation || undefined
            : undefined,
        },
      };

      return response;
    } catch (error) {
      console.error("💥 [API SUBMIT] Lỗi trong quá trình submit:", error);
      logger.error("Error in submitAnswer API:", error);

      if (error instanceof CustomError) {
        throw error;
      }

      throw new CustomError(
        "Lỗi khi xử lý câu trả lời",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Ban contestant due to anti-cheat violations
   * 🛡️ NEW: API to ban contestant for anti-cheat violations
   */
  async banContestant(
    contestantId: number,
    data: {
      matchId: number;
      violationType: string;
      violationCount: number;
      reason: string;
      bannedBy?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      contestantId: number;
      matchId: number;
      bannedAt: string;
      reason: string;
      violationType: string;
      violationCount: number;
    };
  }> {
    try {
      // 1. Kiểm tra contestant tồn tại
      const contestant = await this.prisma.contestant.findUnique({
        where: { id: contestantId },
        include: {
          student: {
            select: { fullName: true, studentCode: true },
          },
        },
      });

      if (!contestant) {
        throw new CustomError(
          "Thí sinh không tồn tại",
          404,
          ERROR_CODES.CONTESTANT_NOT_FOUND
        );
      }

      // 2. Kiểm tra match tồn tại
      const match = await this.prisma.match.findUnique({
        where: { id: data.matchId },
        select: { id: true, name: true, status: true },
      });

      if (!match) {
        throw new CustomError(
          "Trận đấu không tồn tại",
          404,
          ERROR_CODES.MATCH_NOT_FOUND
        );
      }

      // 3. Kiểm tra đã bị ban chưa - kiểm tra trong contestantMatch
      const existingMatch = await this.prisma.contestantMatch.findFirst({
        where: {
          contestantId: contestantId,
          matchId: data.matchId,
        },
      });

      if (existingMatch?.status === "banned") {
        return {
          success: false,
          message: "Thí sinh đã bị cấm tham gia trận đấu này",
        };
      }

      // 4. Cập nhật trạng thái contestant thành eliminate (đã bị loại)
      const bannedAt = new Date();

      await this.prisma.contestant.update({
        where: { id: contestantId },
        data: {
          status: "eliminate",
        },
      });

      // 5. Cập nhật trạng thái contestant_match thành banned
      await this.prisma.contestantMatch.updateMany({
        where: {
          contestantId: contestantId,
          matchId: data.matchId,
        },
        data: {
          status: "banned",
        },
      });
      void broadcastContestantStatus(data.matchId);

      // 6. Tạo anti-cheat violation log
      try {
        await this.prisma.$executeRaw`
          INSERT INTO anti_cheat_violations 
          (contestant_id, match_id, violation_type, violation_count, reason, banned_at, banned_by)
          VALUES 
          (${contestantId}, ${data.matchId}, ${data.violationType}, ${
          data.violationCount
        }, ${data.reason}, ${bannedAt}, ${data.bannedBy || "SYSTEM"})
        `;
      } catch (logError) {
        console.warn(
          "⚠️ [BAN API] Không thể tạo violation log (table có thể chưa tồn tại):",
          logError
        );
        // Không throw error vì đây chỉ là logging
      }

      // 7. Tạo elimination log với lý do anti-cheat
      try {
        await this.prisma.$executeRaw`
          INSERT INTO elimination_logs (contestant_id, question_order, elimination_reason, eliminated_at)
          VALUES (${contestantId}, 0, 'anti_cheat_violation', ${bannedAt})
        `;
      } catch (logError) {
        console.warn("⚠️ [BAN API] Không thể tạo elimination log:", logError);
      }

      const response = {
        success: true,
        message: `Thí sinh ${contestant.student?.fullName} đã bị cấm tham gia do vi phạm ${data.violationType}`,
        data: {
          contestantId: contestantId,
          matchId: data.matchId,
          bannedAt: bannedAt.toISOString(),
          reason: data.reason,
          violationType: data.violationType,
          violationCount: data.violationCount,
        },
      };

      return response;
    } catch (error) {
      console.error("💥 [BAN API] Lỗi trong quá trình ban contestant:", error);
      logger.error("Error in banContestant API:", error);

      if (error instanceof CustomError) {
        throw error;
      }

      throw new CustomError(
        "Lỗi khi xử lý cấm thí sinh",
        500,
        ERROR_CODES.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async deleted(match: number, questionOrder: number) {
    console.log(
      `Deleting results for match ${match} and questionOrder ${questionOrder}`
    );
    return prisma.result.deleteMany({
      where: { matchId: match, questionOrder: questionOrder },
    });
  }
  static async createIsCorrectTrues(
    match: number,
    questionOrder: number,
    contestants: number[]
  ) {
    const data = contestants.map(contestantId => ({
      contestantId: contestantId,
      matchId: match,
      isCorrect: true,
      questionOrder: questionOrder,
    }));
    return prisma.result.createMany({
      data: data,
    });
  }

  static async createIsCorrectFalses(
    match: number,
    questionOrder: number,
    contestants: number[]
  ) {
    const data = contestants.map(contestantId => ({
      contestantId: contestantId,
      matchId: match,
      isCorrect: false,
      questionOrder: questionOrder,
    }));
    return prisma.result.createMany({
      data: data,
    });
  }

  static async statisticals(matchId: number) {
    return prisma.result.groupBy({
      by: ["questionOrder"],
      _count: {
        isCorrect: true,
      },
      where: {
        matchId: matchId,
        isCorrect: true,
      },
    });
  }
  static async chartContestant(matchId: number) {
    // 1. Group theo contestantId và đếm số câu đúng
    const groupedResults = await prisma.result.groupBy({
      by: ["contestantId"],
      where: {
        matchId: matchId,
        isCorrect: true,
      },
      _count: {
        isCorrect: true,
      },
    });

    // 2. Lấy thông tin chi tiết contestant, student, registrationNumber
    const detailed = await Promise.all(
      groupedResults.map(async item => {
        const contestant = await prisma.contestant.findUnique({
          where: {
            id: item.contestantId,
          },
          include: {
            student: {
              select: {
                fullName: true,
              },
            },
            contestantMatches: {
              where: {
                matchId: matchId,
              },
              select: {
                registrationNumber: true,
              },
            },
          },
        });

        return {
          contestantId: item.contestantId,
          correctCount: item._count.isCorrect,
          fullName: contestant?.student?.fullName || "Unknown",
          registrationNumber:
            contestant?.contestantMatches?.[0]?.registrationNumber || null,
        };
      })
    );

    const list = detailed
      .slice(0, 10)
      .sort((a, b) => b.correctCount - a.correctCount); // Lấy 10 thí sinh đầu tiên
    return list;
  }
}
