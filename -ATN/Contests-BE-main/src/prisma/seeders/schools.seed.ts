import { SeedParams } from "@/types/seed";

export default async function seedSchools({ prisma, logger }: SeedParams) {
    try {
        await prisma.school.deleteMany();
        
        const schools = [
            {
                name: "Trường THPT Nguyễn Huệ",
                email: "nguyenhue@edu.vn",
                phone: "0123456789",
                address: "123 Đường Lê Lợi, Quận 1, TP.HCM"
            },
            {
                name: "Trường THPT Lê Thánh Tông",
                email: "lethanhtong@edu.vn", 
                phone: "0123456788",
                address: "456 Đường Trần Hưng Đạo, Quận 3, TP.HCM"
            },
            {
                name: "Trường THPT Trần Phú",
                email: "tranphu@edu.vn",
                phone: "0123456787",
                address: "789 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM"
            },
            {
                name: "Trường THPT Lý Thường Kiệt",
                email: "lythuongkiet@edu.vn",
                phone: "0123456786",
                address: "321 Đường Võ Văn Tần, Quận 10, TP.HCM"
            },
            {
                name: "Trường THPT Bùi Thị Xuân",
                email: "buithixuan@edu.vn",
                phone: "0123456785",
                address: "654 Đường Cách Mạng Tháng 8, Quận Tân Bình, TP.HCM"
            }
        ];

        const createdSchools = await Promise.all(
            schools.map(school => prisma.school.create({ data: school }))
        );

        logger.info(`Tạo thành công ${createdSchools.length} trường học`);
        return createdSchools;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu trường học:", error);
        throw error;
    }
}
