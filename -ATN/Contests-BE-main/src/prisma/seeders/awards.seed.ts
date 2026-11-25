import { SeedParams } from "@/types/seed";
import { AwardType } from "@prisma/client";

export default async function seedAwards({ prisma, logger }: SeedParams) {
  try {
    await prisma.award.deleteMany();

    const contests = await prisma.contest.findMany();
    const contestants = await prisma.contestant.findMany();

    if (contests.length === 0) {
      throw new Error("Không có cuộc thi nào để tạo giải thưởng");
    }

    const awards = [];

    for (const contest of contests) {
      // Tạo các giải thưởng cho mỗi cuộc thi
      const awardTypes = [
        AwardType.firstPrize,
        AwardType.secondPrize,
        AwardType.thirdPrize,
      ];

      for (const awardType of awardTypes) {
        let contestantId = null;

        // Chọn ngẫu nhiên thí sinh cho một số giải (có thể để trống)
        if (contestants.length > 0 && Math.random() > 0.3) {
          const contestContestants = contestants.filter(
            c => c.contestId === contest.id
          );

          if (contestContestants.length > 0) {
            const randomContestant =
              contestContestants[
                Math.floor(Math.random() * contestContestants.length)
              ];

            if (!randomContestant) {
              throw new Error(
                `Không thể tìm thấy thí sinh cho giải thưởng ${getAwardName(
                  awardType
                )} trong cuộc thi ${contest.name}`
              );
            }
            contestantId = randomContestant.id;
          }
        }

        // Tạo unique identifier cho award
        const awardData = {
          name: getAwardName(awardType),
          contestId: contest.id,
          contestantId,
          type: awardType,
        };

        awards.push(awardData);
      }
    }

    // Sử dụng createMany với skipDuplicates thay vì Promise.all
    const createdAwards = await prisma.award.createMany({
      data: awards,
      skipDuplicates: true,
    });

    logger.info(`Tạo thành công ${createdAwards.count} giải thưởng`);
    return createdAwards;
  } catch (error) {
    logger.error("Lỗi khi tạo dữ liệu giải thưởng:", error);
    throw error;
  }
}

// Helper function
function getAwardName(awardType: AwardType): string {
  switch (awardType) {
    case AwardType.firstPrize:
      return "Giải Nhất";
    case AwardType.secondPrize:
      return "Giải Nhì";
    case AwardType.thirdPrize:
      return "Giải Ba";
    default:
      return "Giải Thưởng Khác";
  }
}
