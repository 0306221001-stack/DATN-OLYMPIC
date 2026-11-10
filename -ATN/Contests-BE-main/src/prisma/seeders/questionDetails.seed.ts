import { SeedParams } from "@/types/seed";

export default async function seedQuestionDetails({ prisma, logger }: SeedParams) {
    try {
        await prisma.questionDetail.deleteMany();
        
        const questions = await prisma.question.findMany();
        const packages = await prisma.questionPackage.findMany();
        
        if (questions.length === 0 || packages.length === 0) {
            throw new Error("Không có câu hỏi hoặc gói câu hỏi nào để tạo chi tiết");
        }

        const questionDetails: {
            questionId: number;
            questionPackageId: number;
            questionOrder: number;
            isActive: boolean;
        }[] = [];
        
        // Phân bổ câu hỏi vào các gói
        for (const pkg of packages) {
            // Mỗi gói có 10-15 câu hỏi
            const questionCount = Math.floor(Math.random() * 6) + 10; // 10-15 câu
            const selectedQuestions = questions
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.min(questionCount, questions.length));

            selectedQuestions.forEach((question, index) => {
                questionDetails.push({
                    questionId: question.id,
                    questionPackageId: pkg.id,
                    questionOrder: index + 1,
                    isActive: true
                });
            });
        }

        const createdDetails = await Promise.all(
            questionDetails.map(detail => 
                prisma.questionDetail.create({ data: detail })
            )
        );

        logger.info(`Tạo thành công ${createdDetails.length} chi tiết câu hỏi`);
        return createdDetails;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu chi tiết câu hỏi:", error);
        throw error;
    }
}
