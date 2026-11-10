import { SeedParams } from "@/types/seed";
import { Difficulty, QuestionType } from "@prisma/client";

export default async function seedQuestions({ prisma, logger }: SeedParams) {
    try {
        await prisma.question.deleteMany();
        
        const topics = await prisma.questionTopic.findMany();
        if (topics.length === 0) {
            throw new Error("Không có chủ đề câu hỏi nào để tạo câu hỏi");
        }

        const sampleQuestions = [
            // Toán học
            {
                intro: "Câu hỏi Toán học cơ bản",
                defaultTime: 30,
                questionType: QuestionType.multiple_choice,
                content: "<p>Tính: 2 + 3 = ?</p>",
                options: ["4", "5", "6", "7"],
                correctAnswer: "5",
                score: 10,
                difficulty: Difficulty.Alpha,
                explanation: "2 + 3 = 5"
            },
            {
                intro: "Câu hỏi Toán học nâng cao",
                defaultTime: 60,
                questionType: QuestionType.multiple_choice,
                content: "<p>Đạo hàm của hàm số y = x² là?</p>",
                options: ["x", "2x", "x²", "2x²"],
                correctAnswer: "2x",
                score: 20,
                difficulty: Difficulty.Beta,
                explanation: "Đạo hàm của x² là 2x"
            },
            // Vật lý
            {
                intro: "Câu hỏi Vật lý cơ bản",
                defaultTime: 45,
                questionType: QuestionType.multiple_choice,
                content: "<p>Đơn vị của vận tốc trong hệ SI là gì?</p>",
                options: ["m", "m/s", "m/s²", "kg"],
                correctAnswer: "m/s",
                score: 15,
                difficulty: Difficulty.Alpha,
                explanation: "Vận tốc có đơn vị là mét trên giây (m/s)"
            },
            // Hóa học
            {
                intro: "Câu hỏi Hóa học",
                defaultTime: 40,
                questionType: QuestionType.multiple_choice,
                content: "<p>Công thức hóa học của nước là gì?</p>",
                options: ["H₂O", "CO₂", "NaCl", "H₂SO₄"],
                correctAnswer: "H₂O",
                score: 10,
                difficulty: Difficulty.Alpha,
                explanation: "Nước có công thức hóa học là H₂O"
            },
            // Sinh học
            {
                intro: "Câu hỏi Sinh học",
                defaultTime: 50,
                questionType: QuestionType.multiple_choice,
                content: "<p>DNA là viết tắt của từ gì?</p>",
                options: ["Deoxyribonucleic Acid", "Ribonucleic Acid", "Amino Acid", "Fatty Acid"],
                correctAnswer: "Deoxyribonucleic Acid",
                score: 15,
                difficulty: Difficulty.Beta,
                explanation: "DNA là viết tắt của Deoxyribonucleic Acid (Axit deoxyribonucleic)"
            },
            // Lịch sử
            {
                intro: "Câu hỏi Lịch sử Việt Nam",
                defaultTime: 35,
                questionType: QuestionType.multiple_choice,
                content: "<p>Việt Nam tuyên bố độc lập vào ngày nào?</p>",
                options: ["2/9/1945", "30/4/1975", "19/8/1945", "1/5/1975"],
                correctAnswer: "2/9/1945",
                score: 10,
                difficulty: Difficulty.Alpha,
                explanation: "Việt Nam tuyên bố độc lập vào ngày 2/9/1945"
            },
            // Câu hỏi khó hơn
            {
                intro: "Câu hỏi khó",
                defaultTime: 90,
                questionType: QuestionType.essay,
                content: "<p>Hãy phân tích tác động của cách mạng công nghiệp 4.0 đến hệ thống giáo dục hiện tại và đưa ra những giải pháp thích ứng.</p>",
                options: null,
                correctAnswer: "Câu trả lời mở, cần phân tích đa chiều về tác động tích cực và tiêu cực, đề xuất giải pháp cụ thể.",
                score: 50,
                difficulty: Difficulty.Gold,
                explanation: "Đây là câu hỏi mở, yêu cầu thí sinh phân tích sâu và đưa ra quan điểm cá nhân có cơ sở."
            }
        ];        const questions: Array<{
            intro: string | null;
            defaultTime: number;
            questionType: QuestionType;
            content: string;
            options: any;
            correctAnswer: string;
            score: number;
            difficulty: Difficulty;
            explanation: string | null;
            questionTopicId: number;
            questionMedia: any;
            mediaAnswer: any;
        }> = [];
        
        // Tạo câu hỏi cho mỗi chủ đề
        for (const topic of topics) {
            // Chọn ngẫu nhiên 2-3 câu hỏi mẫu cho mỗi chủ đề
            const questionCount = Math.floor(Math.random() * 2) + 2; // 2-3 câu
            const selectedQuestions = sampleQuestions
                .sort(() => 0.5 - Math.random())
                .slice(0, questionCount);

            for (const q of selectedQuestions) {
                questions.push({
                    ...q,
                    questionTopicId: topic.id,
                    questionMedia: "/uploads/questions/test-img.jpg",
                    mediaAnswer: "/uploads/questions/test-img.jpg"
                });
            }
        }

        const createdQuestions = await Promise.all(
            questions.map(question => prisma.question.create({ data: question }))
        );

        logger.info(`Tạo thành công ${createdQuestions.length} câu hỏi`);
        return createdQuestions;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu câu hỏi:", error);
        throw error;
    }
}
