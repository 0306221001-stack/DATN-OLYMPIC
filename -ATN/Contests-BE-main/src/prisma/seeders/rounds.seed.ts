import { SeedParams } from "@/types/seed";

export default async function seedRounds({ prisma, logger }: SeedParams) {
    try {
        await prisma.round.deleteMany();
        
        const contests = await prisma.contest.findMany();
        if (contests.length === 0) {
            throw new Error("Không có cuộc thi nào để tạo vòng thi");
        }

        const rounds = [];
        
        // Tạo các vòng thi cho mỗi cuộc thi
        for (const contest of contests) {
            if (contest.slug === "duong-len-dinh-olympia-2025") {
                // Các vòng thi Olympia
                const olympiaRounds = [
                    { name: "Vòng Tháng", index: 1, contestId: contest.id },
                    { name: "Vòng Quý", index: 2, contestId: contest.id },
                    { name: "Vòng Năm", index: 3, contestId: contest.id },
                    { name: "Chung kết", index: 4, contestId: contest.id }
                ];
                rounds.push(...olympiaRounds);
            } else if (contest.slug === "tin-hoc-tre-toan-quoc-2025") {
                // Các vòng thi Tin học trẻ
                const informaticsRounds = [
                    { name: "Vòng loại", index: 1, contestId: contest.id },
                    { name: "Bán kết", index: 2, contestId: contest.id },
                    { name: "Chung kết", index: 3, contestId: contest.id }
                ];
                rounds.push(...informaticsRounds);
            } else {
                // Các vòng thi mặc định
                const defaultRounds = [
                    { name: "Vòng sơ loại", index: 1, contestId: contest.id },
                    { name: "Vòng chung kết", index: 2, contestId: contest.id }
                ];
                rounds.push(...defaultRounds);
            }
        }

        const createdRounds = await Promise.all(
            rounds.map(round => prisma.round.create({ data: round }))
        );

        logger.info(`Tạo thành công ${createdRounds.length} vòng thi`);
        return createdRounds;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu vòng thi:", error);
        throw error;
    }
}
