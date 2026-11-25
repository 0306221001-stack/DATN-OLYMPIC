import { SeedParams } from "@/types/seed";

export default async function seedClasses({ prisma, logger }: SeedParams) {
    try {
        await prisma.class.deleteMany();
        
        const schools = await prisma.school.findMany();
        if (schools.length === 0) {
            throw new Error("Không có trường học nào để tạo lớp học");
        }

        const classes = [];
        
        // Tạo lớp cho mỗi trường
        for (const school of schools) {
            const schoolClasses = [
                { name: "10A1", schoolId: school.id },
                { name: "10A2", schoolId: school.id },
                { name: "11A1", schoolId: school.id },
                { name: "11A2", schoolId: school.id },
                { name: "12A1", schoolId: school.id },
                { name: "12A2", schoolId: school.id }
            ];
            classes.push(...schoolClasses);
        }

        const createdClasses = await Promise.all(
            classes.map(classData => prisma.class.create({ data: classData }))
        );

        logger.info(`Tạo thành công ${createdClasses.length} lớp học`);
        return createdClasses;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu lớp học:", error);
        throw error;
    }
}
