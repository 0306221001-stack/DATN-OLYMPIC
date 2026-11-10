import { SeedParams } from "@/types/seed";

export default async function seedQuestionTopics({ prisma, logger }: SeedParams) {
    try {
        await prisma.questionTopic.deleteMany();
        
        const topics = [
            { name: "Toán học" },
            { name: "Vật lý" },
            { name: "Hóa học" },
            { name: "Sinh học" },
            { name: "Ngữ văn" },
            { name: "Lịch sử" },
            { name: "Địa lý" },
            { name: "Tiếng Anh" },
            { name: "Tin học" },
            { name: "Giáo dục công dân" },
            { name: "Thể dục" },
            { name: "Kiến thức chung" },
            { name: "Văn hóa dân gian" },
            { name: "Khoa học tự nhiên" },
            { name: "Khoa học xã hội" }
        ];

        const createdTopics = await Promise.all(
            topics.map(topic => prisma.questionTopic.create({ data: topic }))
        );

        logger.info(`Tạo thành công ${createdTopics.length} chủ đề câu hỏi`);
        return createdTopics;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu chủ đề câu hỏi:", error);
        throw error;
    }
}
