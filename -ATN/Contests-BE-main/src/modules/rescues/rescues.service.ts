import { prisma } from "@/config/database";
import {
  RescuesQueryInput,
  Rescues,
  RescuesById,
  CreateRescueInput,
  UpdateRescueInput,
} from "@/modules/rescues";
import { logger } from "@/utils/logger";
import { Rescue, RescueStatus } from "@prisma/client";
import { ContestantService } from "../contestant";

export default class RescueService {
  static async getAll(
    query: RescuesQueryInput,
    contestId: number
  ): Promise<{
    rescues: Rescues[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, matchId, status, rescueType } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (matchId !== undefined) {
      whereClause.matchId = matchId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    if (rescueType !== undefined) {
      whereClause.rescueType = rescueType;
    }

    if (search) {
      const keywords = search.trim().split(/\s+/);
      whereClause.OR = keywords.flatMap((keyword: string) => [
        { name: { contains: keyword } },
        { match: { is: { name: { contains: keyword } } } },
      ]);
    }

    const RescueRaw = await prisma.rescue.findMany({
      where: {
        ...whereClause,
        match: {
          contestId: contestId,
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        rescueType: true,
        questionFrom: true,
        questionTo: true,
        studentIds: true,
        supportAnswers: true,
        remainingContestants: true,
        questionOrder: true,
        index: true,
        status: true,
        match: {
          select: {
            name: true,
          },
        },
      },
    });

    const rescues = RescueRaw.map(key => ({
      id: key.id,
      name: key.name,
      rescueType: (key.rescueType === "resurrected"
        ? "Hồi sinh"
        : "Phao cứu sinh") as "Hồi sinh" | "Phao cứu sinh",

      questionFrom: key.questionFrom,
      questionTo: key.questionTo,
      studentIds: key.studentIds,
      supportAnswers: key.supportAnswers,
      remainingContestants: key.remainingContestants,
      questionOrder: key.questionOrder,
      index: key.index ?? undefined,
      status:
        key.status === "notUsed"
          ? "Chưa sử dụng"
          : key.status === "used"
          ? "Đã sử dụng"
          : ("Đã qua" as "Chưa sử dụng" | "Đã sử dụng" | "Đã qua"),
      matchName: key.match?.name,
    }));
    const total = await prisma.rescue.count({
      where: { ...whereClause, match: { contestId: contestId } },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      rescues: rescues,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getRescueBy(data: any): Promise<RescuesById | null> {
    return prisma.rescue.findFirst({
      where: {
        ...data,
      },
      select: {
        id: true,
        name: true,
        rescueType: true,
        questionFrom: true,
        questionTo: true,
        studentIds: true,
        supportAnswers: true,
        remainingContestants: true,
        questionOrder: true,
        index: true,
        status: true,
        matchId: true,
        match: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static async create(data: CreateRescueInput): Promise<Rescue | null> {
    return prisma.rescue.create({
      data: {
        ...data,
      },
    });
  }

  static async updateRescue(
    id: number,
    data: UpdateRescueInput
  ): Promise<Rescue | null> {
    const updateData: any = {};

    console.log(data);

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.matchId !== undefined) {
      updateData.matchId = data.matchId;
    }

    if (data.index !== undefined) {
      updateData.index = data.index;
    }

    if (data.questionOrder !== undefined) {
      updateData.questionOrder = data.questionOrder;
    }

    if (data.questionFrom !== undefined) {
      updateData.questionFrom = data.questionFrom;
    }

    if (data.questionTo !== undefined) {
      updateData.questionTo = data.questionTo;
    }

    if (data.remainingContestants !== undefined) {
      updateData.remainingContestants = data.remainingContestants;
    }

    if (data.rescueType !== undefined) {
      updateData.rescueType = data.rescueType;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.studentIds !== undefined) {
      updateData.studentIds = data.studentIds;
    }

    if (data.supportAnswers !== undefined) {
      updateData.supportAnswers = data.supportAnswers;
    }

    return prisma.rescue.update({
      where: { id: id },
      data: {
        ...updateData,
      },
    });
  }

  static async delete(id: number): Promise<Rescue> {
    return prisma.rescue.delete({
      where: {
        id: id,
      },
    });
  }

  // API: Lấy danh sách rescue theo matchId và rescueType
  static async getRescuesByMatchIdAndType(
    matchId: number,
    rescueType: string = "resurrected"
  ): Promise<
    Array<{
      id: number;
      name: string;
      rescueType: string;
      status: string;
      questionOrder: number | null;
      index: number | null;
      studentIds: any;
      questionFrom: number;
      questionTo: number;
    }>
  > {
    const rescues = await prisma.rescue.findMany({
      where: {
        matchId: matchId,
        rescueType: rescueType as any,
      },
      select: {
        id: true,
        name: true,
        rescueType: true,
        status: true,
        questionOrder: true,
        index: true,
        studentIds: true,
        questionFrom: true,
        questionTo: true,
      },
      orderBy: [
        { questionFrom: "asc" },
        { questionTo: "asc" },
        { createdAt: "asc" },
      ],
    });

    return rescues.map(rescue => ({
      id: rescue.id,
      name: rescue.name,
      rescueType: rescue.rescueType,
      status: rescue.status,
      questionOrder: rescue.questionOrder,
      index: rescue.index,
      studentIds: rescue.studentIds,
      questionFrom: rescue.questionFrom,
      questionTo: rescue.questionTo,
    }));
  }

  /**================================Cập nhật status dựa vào câu hỏi hiện tại ============================== */
  // static async updateRescueStatusByCurrentQuestion(
  //   matchId: number,
  //   currentQuestionOrder: number
  // ): Promise<{
  //   updatedRescues: any[];
  //   currentEligibleRescues: any[];
  //   totalUpdated: number;
  //   summary: {
  //     passed: number;
  //     notEligible: number;
  //     notUsed: number;
  //     unchanged: number;
  //   };
  // }> {
  //   try {
  //     // Lấy tất cả rescue của match, sắp xếp theo index
  //     const rescues = await prisma.rescue.findMany({
  //       where: { matchId },
  //       orderBy: [{ index: 'asc' }, { createdAt: 'asc' }]
  //     });

  //     if (rescues.length === 0) {
  //       return {
  //         updatedRescues: [],
  //         currentEligibleRescues: [],
  //         totalUpdated: 0,
  //         summary: { passed: 0, notEligible: 0, notUsed: 0, unchanged: 0 }
  //       };
  //     }

  //     // Tìm các rescue thỏa mãn điều kiện hiện tại
  //     const currentEligibleRescues = rescues.filter(rescue =>
  //       rescue.questionFrom <= currentQuestionOrder &&
  //       currentQuestionOrder <= rescue.questionTo
  //     );

  //     const updates: Promise<any>[] = [];
  //     const summary = { passed: 0, notEligible: 0, notUsed: 0, unchanged: 0 };

  //     if (currentEligibleRescues.length > 0) {
  //       // Nhóm theo index để xử lý trường hợp nhiều rescue cùng index
  //       const groupedByIndex = currentEligibleRescues.reduce((acc, rescue) => {
  //         if (!acc[rescue.index]) {
  //           acc[rescue.index] = [];
  //         }
  //         acc[rescue.index].push(rescue);
  //         return acc;
  //       }, {} as Record<number, any[]>);

  //       // Lấy index nhỏ nhất
  //       const currentIndex = Math.min(...Object.keys(groupedByIndex).map(Number));

  //       // 1. Cập nhật các rescue có index nhỏ hơn thành 'passed'
  //       const passedRescues = rescues.filter(rescue =>
  //         rescue.index < currentIndex &&
  //         rescue.status !== RescueStatus.used
  //       );

  //       for (const rescue of passedRescues) {
  //         updates.push(
  //           prisma.rescue.update({
  //             where: { id: rescue.id },
  //             data: { status: RescueStatus.passed }
  //           })
  //         );
  //         summary.passed++;
  //       }

  //       // 2. Cập nhật các rescue có index lớn hơn thành 'notEligible'
  //       const notEligibleRescues = rescues.filter(rescue =>
  //         rescue.index > currentIndex &&
  //         rescue.status !== RescueStatus.used
  //       );

  //       for (const rescue of notEligibleRescues) {
  //         updates.push(
  //           prisma.rescue.update({
  //             where: { id: rescue.id },
  //             data: { status: RescueStatus.notEligible }
  //           })
  //         );
  //         summary.notEligible++;
  //       }

  //       // 3. Cập nhật các rescue có index hiện tại thành 'notUsed'
  //       const currentIndexRescues = groupedByIndex[currentIndex] || [];
  //       for (const rescue of currentIndexRescues) {
  //         if (rescue.status !== RescueStatus.used) {
  //           updates.push(
  //             prisma.rescue.update({
  //               where: { id: rescue.id },
  //               data: { status: RescueStatus.notUsed }
  //             })
  //           );
  //           summary.notUsed++;
  //         } else {
  //           summary.unchanged++;
  //         }
  //       }

  //     } else {
  //       // Không có rescue nào thỏa mãn điều kiện
  //       // Cập nhật tất cả rescue chưa dùng thành 'notEligible'
  //       const notEligibleRescues = rescues.filter(rescue =>
  //         rescue.status === RescueStatus.notUsed
  //       );

  //       for (const rescue of notEligibleRescues) {
  //         updates.push(
  //           prisma.rescue.update({
  //             where: { id: rescue.id },
  //             data: { status: RescueStatus.notEligible }
  //           })
  //         );
  //         summary.notEligible++;
  //       }

  //       // Đếm các rescue không thay đổi
  //       summary.unchanged = rescues.filter(rescue =>
  //         rescue.status === RescueStatus.used ||
  //         rescue.status === RescueStatus.passed ||
  //         rescue.status === RescueStatus.notEligible
  //       ).length;
  //     }

  //     // Thực hiện tất cả cập nhật
  //     const updatedRescues = await Promise.all(updates);

  //     // Lấy thông tin rescue đã cập nhật
  //     const updatedRescueDetails = await prisma.rescue.findMany({
  //       where: { matchId },
  //       orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
  //       select: {
  //         id: true,
  //         name: true,
  //         index: true,
  //         status: true,
  //         questionFrom: true,
  //         questionTo: true,
  //         rescueType: true
  //       }
  //     });

  //     return {
  //       updatedRescues: updatedRescueDetails,
  //       currentEligibleRescues: currentEligibleRescues.map(r => ({
  //         id: r.id,
  //         name: r.name,
  //         index: r.index,
  //         status: r.status,
  //         questionFrom: r.questionFrom,
  //         questionTo: r.questionTo
  //       })),
  //       totalUpdated: updatedRescues.length,
  //       summary
  //     };

  //   } catch (error) {
  //     logger.error('Error updating rescue status:', error);
  //     throw new Error(`Lỗi cập nhật trạng thái rescue: ${(error as Error).message}`);
  //   }
  // }
  static async updateRescueStatusByCurrentQuestion(
    matchId: number,
    currentQuestionOrder: number
  ): Promise<{
    updatedRescues: any[];
    currentEligibleRescues: any[];
    totalUpdated: number;
    summary: {
      passed: number;
      notEligible: number;
      notUsed: number;
      unchanged: number;
    };
  }> {
    try {
      // số thí sinh còn lại trong trận đấu
      const remainingContestantsCount =
        await ContestantService.getRemainingContestantsCount(matchId);

      // Lấy tất cả rescue của match
      const rescues = await prisma.rescue.findMany({
        where: { matchId },
        orderBy: [
          { questionFrom: "asc" },
          { questionTo: "asc" },
          { createdAt: "asc" },
        ],
      });

      if (rescues.length === 0) {
        return {
          updatedRescues: [],
          currentEligibleRescues: [],
          totalUpdated: 0,
          summary: { passed: 0, notEligible: 0, notUsed: 0, unchanged: 0 },
        };
      }

      // Tìm các rescue thỏa mãn điều kiện hiện tại (có thể sử dụng ở câu hỏi hiện tại)
      const currentEligibleRescues = rescues.filter(
        rescue =>
          rescue.questionFrom <= currentQuestionOrder &&
          currentQuestionOrder <= rescue.questionTo
      );

      const updates: Promise<any>[] = [];
      const summary = { passed: 0, notEligible: 0, notUsed: 0, unchanged: 0 };

      // Xử lý từng rescue dựa trên vị trí của nó so với câu hỏi hiện tại
      for (const rescue of rescues) {
        // Rescue đã được sử dụng thì không thay đổi
        if (rescue.status === RescueStatus.used) {
          summary.unchanged++;
          continue;
        }

        // Xác định trạng thái mới dựa trên questionFrom, questionTo và currentQuestionOrder
        let newStatus: RescueStatus | null = null;

        if (rescue.questionTo < currentQuestionOrder) {
          // Rescue đã qua thời điểm có thể sử dụng
          newStatus = RescueStatus.passed;
        } else if (rescue.questionFrom > currentQuestionOrder) {
          // Rescue chưa đến thời điểm có thể sử dụng
          newStatus = RescueStatus.notEligible;
        } else {
          // Rescue có thể sử dụng ở câu hỏi hiện tại
          // TẤT CẢ các rescue trong range đều được đặt thành 'notUsed'
          newStatus = RescueStatus.notUsed;
        }

        // Chỉ cập nhật nếu trạng thái thay đổi
        if (newStatus && rescue.status !== newStatus) {
          updates.push(
            prisma.rescue.update({
              where: { id: rescue.id },
              data: { status: newStatus },
            })
          );

          // Cập nhật summary
          switch (newStatus) {
            case RescueStatus.passed:
              summary.passed++;
              break;
            case RescueStatus.notEligible:
              summary.notEligible++;
              break;
            case RescueStatus.notUsed:
              summary.notUsed++;
              break;
          }
        } else {
          summary.unchanged++;
        }
      }

      // Thực hiện tất cả cập nhật
      const updatedRescues = await Promise.all(updates);

      // Lấy thông tin rescue đã cập nhật
      const updatedRescueDetails = await prisma.rescue.findMany({
        where: { matchId },
        orderBy: [
          { questionFrom: "asc" },
          { questionTo: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          id: true,
          name: true,
          index: true,
          status: true,
          questionFrom: true,
          questionTo: true,
          rescueType: true,
          remainingContestants: true,
        },
      });

      // Map kết quả với trường isEffect
      const updatedRescuesWithEffect = updatedRescueDetails.map(rescue => {
        // Kiểm tra điều kiện để hiển thị effect:
        // 1. Rescue phải có status 'notUsed'
        // 2. Rescue phải trong range câu hỏi hiện tại
        // 3. Số thí sinh còn lại phải <= remainingContestants của rescue
        const isInRange =
          rescue.questionFrom <= currentQuestionOrder &&
          currentQuestionOrder <= rescue.questionTo;
        const hasEnoughContestants =
          remainingContestantsCount <= rescue.remainingContestants;
        const isNotUsed = rescue.status === "notUsed";

        const isEffect = isInRange && hasEnoughContestants && isNotUsed;

        return {
          ...rescue,
          isEffect,
          currentContestantsCount: remainingContestantsCount, // Thêm thông tin để debug
        };
      });

      return {
        updatedRescues: updatedRescuesWithEffect,
        currentEligibleRescues: currentEligibleRescues.map(r => {
          // Tính toán isEffect cho currentEligibleRescues
          const hasEnoughContestants =
            remainingContestantsCount <= r.remainingContestants;
          const isNotUsed = r.status === "notUsed";
          const isEffect = hasEnoughContestants && isNotUsed;

          return {
            id: r.id,
            name: r.name,
            index: r.index,
            status: r.status,
            questionFrom: r.questionFrom,
            questionTo: r.questionTo,
            remainingContestants: r.remainingContestants,
            isEffect,
            currentContestantsCount: remainingContestantsCount,
          };
        }),
        totalUpdated: updatedRescues.length,
        summary,
      };
    } catch (error) {
      logger.error("Error updating rescue status:", error);
      throw new Error(
        `Lỗi cập nhật trạng thái rescue: ${(error as Error).message}`
      );
    }
  }

  // Lấy danh sách rescue theo matchId và rescueType là "lifelineUsed"
  static async getListRescue(matchId: number) {
    return prisma.rescue.findMany({
      where: { matchId: matchId, rescueType: "lifelineUsed" },
      select: {
        id: true,
        name: true,
        index: true,
        status: true,
        questionFrom: true,
        questionTo: true,
        rescueType: true,
      },
    });
  }

  // Lấy danh sách rescue theo matchId với tất cả rescueType
  static async getAllRescue(matchId: number, currentQuestionOrder?: number) {
    try {
      // Lấy số thí sinh còn lại
      const remainingContestantsCount =
        await ContestantService.getRemainingContestantsCount(matchId);

      const rescues = await prisma.rescue.findMany({
        where: { matchId: matchId },
        select: {
          id: true,
          name: true,
          index: true,
          status: true,
          questionFrom: true,
          questionTo: true,
          rescueType: true,
          remainingContestants: true,
        },
        orderBy: [
          { questionFrom: "asc" },
          { questionTo: "asc" },
          { createdAt: "asc" },
        ],
      });

      // Map kết quả với trường isEffect
      return rescues.map(rescue => {
        let isEffect = false;

        if (currentQuestionOrder !== undefined) {
          // Kiểm tra điều kiện để hiển thị effect:
          // 1. Rescue phải có status 'notUsed'
          // 2. Rescue phải trong range câu hỏi hiện tại
          // 3. Số thí sinh còn lại phải <= remainingContestants của rescue
          const isInRange =
            rescue.questionFrom <= currentQuestionOrder &&
            currentQuestionOrder <= rescue.questionTo;
          const hasEnoughContestants =
            remainingContestantsCount <= rescue.remainingContestants;
          const isNotUsed = rescue.status === "notUsed";

          isEffect = isInRange && hasEnoughContestants && isNotUsed;
        }

        return {
          id: rescue.id,
          name: rescue.name,
          index: rescue.index,
          status: rescue.status,
          questionFrom: rescue.questionFrom,
          questionTo: rescue.questionTo,
          rescueType: rescue.rescueType,
          remainingContestants: rescue.remainingContestants,
          isEffect,
          currentContestantsCount: remainingContestantsCount,
        };
      });
    } catch (error) {
      logger.error("Error getting all rescues with effect:", error);
      throw new Error(`Lỗi lấy danh sách rescue: ${(error as Error).message}`);
    }
  }

  static async ListRescueByMatchId(matchId: number) {
    return prisma.rescue.findMany({
      where: {
        matchId: matchId,
      },
      select: {
        id: true,
        status: true,
        questionFrom: true,
        questionTo: true,
        remainingContestants: true,
      },
    });
  }
}
