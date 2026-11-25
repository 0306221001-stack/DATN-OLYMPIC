import { SeedParams } from "@/types/seed";
import { RescueType, RescueStatus } from "@prisma/client";

export default async function seedRescues({ prisma, logger }: SeedParams) {
    try {
        await prisma.rescue.deleteMany();
        
        const matches = await prisma.match.findMany({
            include: {
                questionPackage: {
                    include: { questionDetails: true }
                }
            }
        });
        
        if (matches.length === 0) {
            logger.warn("Không có trận đấu nào để tạo cơ hội cứu");
            return [];
        }

        const rescues = [];
        
        for (const match of matches) {
            // Mỗi trận có 1-2 cơ hội cứu
            const rescueCount = Math.floor(Math.random() * 2) + 1;
            const totalQuestions = match.questionPackage.questionDetails.length;
            
            for (let i = 1; i <= rescueCount; i++) {
                const questionFrom = Math.floor(Math.random() * (totalQuestions - 5)) + 1;
                const questionTo = questionFrom + 3; // Cứu trong 3 câu
                
                rescues.push({
                    name: `Cơ hội cứu ${i} - ${match.name}`,
                    rescueType: Math.random() > 0.5 ? RescueType.resurrected : RescueType.lifelineUsed,
                    questionFrom,
                    questionTo,
                    studentIds: [1, 2, 3], // Mock student IDs
                    supportAnswers: [
                        { questionOrder: questionFrom, answer: "A" },
                        { questionOrder: questionFrom + 1, answer: "B" },
                        { questionOrder: questionFrom + 2, answer: "C" }
                    ],
                    remainingContestants: Math.floor(Math.random() * 5) + 5, // 5-9 thí sinh còn lại
                    maxStudent: 10,
                    index: i,
                    status: Math.random() > 0.5 ? RescueStatus.used : RescueStatus.notUsed,
                    matchId: match.id
                });
            }
        }

        const createdRescues = await Promise.all(
            rescues.map(rescue => prisma.rescue.create({ data: rescue }))
        );

        logger.info(`Tạo thành công ${createdRescues.length} cơ hội cứu`);
        return createdRescues;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu cơ hội cứu:", error);
        throw error;
    }
}
