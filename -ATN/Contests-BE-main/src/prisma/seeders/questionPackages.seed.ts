import { SeedParams } from "@/types/seed";

export default async function seedQuestionPackages({ prisma, logger }: SeedParams) {
    try {
        await prisma.questionPackage.deleteMany();
        
        const packages = [
            { name: "Gói câu hỏi Khởi động" },
            { name: "Gói câu hỏi Tăng tốc" },
            { name: "Gói câu hỏi Về đích" },
            { name: "Gói câu hỏi Câu hỏi phụ" },
            { name: "Gói câu hỏi Thi đấu" },
            { name: "Gói câu hỏi Chung kết" },
            { name: "Gói câu hỏi Bán kết" },
            { name: "Gói câu hỏi Vòng loại" },
            { name: "Gói câu hỏi Toán học cơ bản" },
            { name: "Gói câu hỏi Khoa học tự nhiên" },
            { name: "Gói câu hỏi Khoa học xã hội" },
            { name: "Gói câu hỏi Văn hóa Việt Nam" },
            { name: "Gói câu hỏi Thể thao" },
            { name: "Gói câu hỏi Công nghệ" },
            { name: "Gói câu hỏi Nghệ thuật" }
        ];

        const createdPackages = await Promise.all(
            packages.map(pkg => prisma.questionPackage.create({ data: pkg }))
        );

        logger.info(`Tạo thành công ${createdPackages.length} gói câu hỏi`);
        return createdPackages;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu gói câu hỏi:", error);
        throw error;
    }
}
