import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Thông tin test mới
  const studentId = 200;
  const userId = 205;
  const classId = 2;
  const contestId = 3;
  const roundId = 7;
  const matchId = 25;
  const testUsername = 'khoa5';
  const testEmail = 'admin5@example.com';
  const testPassword = '123456'; // Đổi nếu bạn dùng pass khác khi đăng ký

  // 1. Đảm bảo studentId=199 tồn tại, nếu chưa có thì tạo mới
  let student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    // Kiểm tra user
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      user = await prisma.user.create({
        data: {
          id: userId,
          username: testUsername,
          email: testEmail,
          password: hashedPassword,
          role: 'Student',
          isActive: true,
        },
      });
      console.log('Đã tạo user test:', user.id);
    } else {
      console.log('Đã tồn tại user test:', user.id);
    }
    // Tạo student
    student = await prisma.student.create({
      data: {
        id: studentId,
        fullName: 'Nguyễn Thị Test4',
        studentCode: 'SV25735916',
        classId: classId,
        userId: userId,
        isActive: true,
      },
    });
    console.log('Đã tạo student test:', student.id);
  } else {
    console.log('Đã tồn tại student test:', student.id);
  }

  // 2. Thêm contestant cho student vào contest/round
  let contestant = await prisma.contestant.findFirst({
    where: { studentId, contestId, roundId },
  });
  if (!contestant) {
    contestant = await prisma.contestant.create({
      data: {
        contestId,
        studentId,
        roundId,
        status: 'compete',
      },
    });
    console.log('Đã tạo contestant:', contestant.id);
  } else {
    console.log('Đã tồn tại contestant:', contestant.id);
  }

  // 3. Tìm group thuộc matchId
  const group = await prisma.group.findFirst({ where: { matchId } });
  if (!group) throw new Error('Không tìm thấy group nào cho matchId=' + matchId);

  // 4. Thêm contestantMatch
  const contestantMatch = await prisma.contestantMatch.findFirst({
    where: { contestantId: contestant.id, matchId, groupId: group.id },
  });
  if (!contestantMatch) {
    await prisma.contestantMatch.create({
      data: {
        contestantId: contestant.id,
        matchId,
        groupId: group.id,
        registrationNumber: 1,
        status: 'not_started',
      },
    });
    console.log('Đã tạo contestantMatch cho thí sinh test');
  } else {
    console.log('Đã tồn tại contestantMatch cho thí sinh test');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 