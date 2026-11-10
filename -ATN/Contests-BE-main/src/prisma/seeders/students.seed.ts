import { SeedParams } from "@/types/seed";
import bcrypt from "bcrypt";

export default async function seedStudents({ prisma, logger }: SeedParams) {
    try {
        // Xóa dữ liệu cũ (do foreign key, User sẽ tự động xóa Student)
        await prisma.student.deleteMany();
        await prisma.user.deleteMany({
            where: { role: 'Student' }
        });
        
        const classes = await prisma.class.findMany({
            include: { school: true }
        });
        
        if (classes.length === 0) {
            throw new Error("Không có lớp học nào để tạo học sinh");
        }

        const createdStudents = [];
        
        // Tạo 5-8 học sinh cho mỗi lớp
        for (const classInfo of classes) {
            const studentCount = Math.floor(Math.random() * 4) + 5; // 5-8 học sinh
            
            for (let i = 1; i <= studentCount; i++) {
                const grade = classInfo.name.charAt(0); // Lấy khối (10, 11, 12)
                const studentCode = `${grade}${String(classInfo.id).padStart(2, '0')}${String(i).padStart(2, '0')}`;
                const username = `student_${studentCode}`;
                const email = `${username}@school.edu.vn`;
                const password = await bcrypt.hash("123456", 10);
                
                // Tạo User trước
                const user = await prisma.user.create({
                    data: {
                        username: username,
                        email: email,
                        password: password,
                        role: 'Student',
                        isActive: true
                    }
                });

                // Tạo Student với userId
                const student = await prisma.student.create({
                    data: {
                        fullName: `Học sinh ${i} lớp ${classInfo.name} - ${classInfo.school.name}`,
                        studentCode: studentCode,
                        classId: classInfo.id,
                        userId: user.id
                    }
                });

                createdStudents.push(student);
            }
        }

        logger.info(`Tạo thành công ${createdStudents.length} học sinh và tài khoản người dùng tương ứng`);
        return createdStudents;
    } catch (error) {
        logger.error("Lỗi khi tạo dữ liệu học sinh:", error);
        throw error;
    }
}
