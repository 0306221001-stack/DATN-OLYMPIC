import { SeedParams } from "@/types/seed";
import { ContestantMatchStatus } from "@prisma/client";

export default async function seedContestantMatches({ prisma, logger }: SeedParams) {
    try {
        await prisma.contestantMatch.deleteMany();
        
        const contestants = await prisma.contestant.findMany();
        const groups = await prisma.group.findMany({
            include: { match: true }
        });
        
        if (contestants.length === 0 || groups.length === 0) {
            throw new Error("Không có thí sinh hoặc nhóm nào để tạo phân nhóm thi đấu");
        }

        const contestantMatches: {
            contestantId: number;
            matchId: number;
            groupId: number;
            registrationNumber: number;
            status: ContestantMatchStatus;
        }[] = [];
        
        // Theo dõi thí sinh đã được phân nhóm để tránh duplicate
        const assignedContestants = new Set<number>();
        
        for (const group of groups) {
            // Mỗi nhóm có 3-5 thí sinh
            const contestantCount = Math.floor(Math.random() * 3) + 3; // 3-5 thí sinh
            const availableContestants = contestants
                .filter(c => 
                    c.roundId === group.match.roundId && 
                    !assignedContestants.has(c.id) // Tránh trùng lặp
                )
                .sort(() => 0.5 - Math.random())
                .slice(0, contestantCount);

            availableContestants.forEach((contestant, index) => {
                // Đánh dấu thí sinh đã được phân nhóm
                assignedContestants.add(contestant.id);
                
                contestantMatches.push({
                    contestantId: contestant.id,
                    matchId: group.matchId,
                    groupId: group.id,
                    registrationNumber: index + 1,
                    status: ContestantMatchStatus.not_started
                });
            });
        }

        // Sử dụng createMany thay vì Promise.all để tránh race condition
        const createdContestantMatches = await prisma.contestantMatch.createMany({
            data: contestantMatches,
            skipDuplicates: true // Bỏ qua nếu có duplicate
        });

        logger.info(`Tạo thành công ${createdContestantMatches.count} phân nhóm thí sinh`);
        return createdContestantMatches;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu phân nhóm thí sinh:", error);
        throw error;
    }
}