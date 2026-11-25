import { SeedParams } from "@/types/seed";
import { ContestantStatus } from "@prisma/client";

export default async function seedContestants({ prisma, logger }: SeedParams) {
  try {
    await prisma.contestant.deleteMany();

    const contests = await prisma.contest.findMany({
      include: { round: true },
    });
    const students = await prisma.student.findMany({
      include: { class: { include: { school: true } } },
    });

    if (contests.length === 0 || students.length === 0) {
      throw new Error("Không có cuộc thi hoặc học sinh nào để tạo thí sinh");
    }

    const contestants = [];

    for (const contest of contests) {
      // Mỗi cuộc thi có 20-50 thí sinh
      const contestantCount = Math.floor(Math.random() * 31) + 20; // 20-50 thí sinh
      const selectedStudents = students
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(contestantCount, students.length));

      for (const student of selectedStudents) {
        // Thí sinh tham gia vòng đầu tiên
        const firstRound = contest.round.find(r => r.index === 1);
        if (firstRound) {
          contestants.push({
            contestId: contest.id,
            studentId: student.id,
            roundId: firstRound.id,
            status: ContestantStatus.compete,
          });
        }
      }
    }

    const createdContestants = await Promise.all(
      contestants.map(contestant =>
        prisma.contestant.create({ data: contestant })
      )
    );

    logger.info(`Tạo thành công ${createdContestants.length} thí sinh`);
    return createdContestants;
  } catch (error) {
    logger.error("Lỗi khi tạo dữ liệu thí sinh:", error);
    throw error;
  }
}
