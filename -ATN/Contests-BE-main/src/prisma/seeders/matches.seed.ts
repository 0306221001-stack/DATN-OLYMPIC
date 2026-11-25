import { SeedParams } from "@/types/seed";
import { ContestStatus } from "@prisma/client";

export default async function seedMatches({ prisma, logger }: SeedParams) {
    try {
        await prisma.match.deleteMany();
        
        const contests = await prisma.contest.findMany({
            include: { round: true }
        });
        const packages = await prisma.questionPackage.findMany();
        
        if (contests.length === 0 || packages.length === 0) {
            throw new Error("Không có cuộc thi hoặc gói câu hỏi nào để tạo trận đấu");
        }

        const matches = [];
        
        for (const contest of contests) {
            for (const round of contest.round) {
                // Mỗi vòng có 2-4 trận đấu
                const matchCount = Math.floor(Math.random() * 3) + 2; // 2-4 trận
                
                for (let i = 1; i <= matchCount; i++) {
                    const startTime = new Date(contest.startTime);
                    startTime.setHours(startTime.getHours() + (i - 1) * 2); // Cách nhau 2 tiếng
                    
                    const endTime = new Date(startTime);
                    endTime.setHours(endTime.getHours() + 1.5); // Mỗi trận 1.5 tiếng
                    
                    const randomPackage = packages[Math.floor(Math.random() * packages.length)];
                    
                    if (!randomPackage) {
                        throw new Error("Không thể tìm thấy gói câu hỏi");
                    }
                    
                    matches.push({
                        name: `${round.name} - Trận ${i}`,
                        startTime,
                        endTime,
                        status: ContestStatus.upcoming,
                        currentQuestion: 1,
                        questionPackageId: randomPackage.id,
                        contestId: contest.id,
                        roundId: round.id
                    });
                }
            }
        }

        const createdMatches = await Promise.all(
            matches.map(match => prisma.match.create({ data: match }))
        );

        logger.info(`Tạo thành công ${createdMatches.length} trận đấu`);
        return createdMatches;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu trận đấu:", error);
        throw error;
    }
}
