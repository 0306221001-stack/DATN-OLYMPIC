import { SeedParams } from "@/types/seed";

export default async function seedClassVideos({ prisma, logger }: SeedParams) {
    try {
        await prisma.classVideo.deleteMany();
        
        const classes = await prisma.class.findMany({
            include: { school: true }
        });
        
        if (classes.length === 0) {
            throw new Error("Không có lớp học nào để tạo video giới thiệu");
        }

        const classVideos = [];
        
        // Tạo video cho một số lớp (không phải tất cả)
        const selectedClasses = classes
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.ceil(classes.length * 0.6)); // 60% lớp có video

        for (const classInfo of selectedClasses) {
            classVideos.push({
                name: `Video giới thiệu lớp ${classInfo.name} - ${classInfo.school.name}`,
                slogan: `"Đoàn kết - Sáng tạo - Vượt trội"`,
                classId: classInfo.id,
                videos: `/videos/classes/class_${classInfo.id}_intro.mp4`
            });
        }

        const createdVideos = await Promise.all(
            classVideos.map(video => prisma.classVideo.create({ data: video }))
        );

        logger.info(`Tạo thành công ${createdVideos.length} video giới thiệu lớp`);
        return createdVideos;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu video lớp:", error);
        throw error;
    }
}
