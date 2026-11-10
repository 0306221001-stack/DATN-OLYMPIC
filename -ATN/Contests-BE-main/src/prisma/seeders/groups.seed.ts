import { SeedParams } from "@/types/seed";

export default async function seedGroups({ prisma, logger }: SeedParams) {
    try {
        await prisma.group.deleteMany();
        
        const users = await prisma.user.findMany({
            where: { role: "Judge" }
        });
        const matches = await prisma.match.findMany();
        
        if (matches.length === 0) {
            logger.warn("Không có trận đấu nào để tạo nhóm");
            return [];
        }

        // Tạo user Judge nếu chưa có
        let judges = users;
        if (judges.length === 0) {
            const judgeUsers = [
                {
                    username: "judge1",
                    email: "judge1@contest.com", 
                    password: "judge123",
                    role: "Judge" as const
                },
                {
                    username: "judge2",
                    email: "judge2@contest.com",
                    password: "judge123", 
                    role: "Judge" as const
                }
            ];

            judges = await Promise.all(
                judgeUsers.map(user => prisma.user.create({ data: user }))
            );
        }

        const groups = [];
        
        for (const match of matches) {
            // Mỗi trận đấu có 2-4 nhóm
            const groupCount = Math.floor(Math.random() * 3) + 2; // 2-4 nhóm
            
            for (let i = 1; i <= groupCount; i++) {
                const randomJudge = judges[Math.floor(Math.random() * judges.length)];
                if (!randomJudge) {
                    throw new Error("Không thể tìm thấy người đánh giá (Judge)");
                }
                groups.push({
                    name: `Nhóm ${String.fromCharCode(64 + i)} - ${match.name}`, // A, B, C, D
                    userId: randomJudge.id,
                    matchId: match.id,
                    confirmCurrentQuestion: 1
                });
            }
        }

        const createdGroups = await Promise.all(
            groups.map(group => prisma.group.create({ data: group }))
        );

        logger.info(`Tạo thành công ${createdGroups.length} nhóm thi đấu`);
        return createdGroups;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu nhóm:", error);
        throw error;
    }
}
