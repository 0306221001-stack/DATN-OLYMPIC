import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { logger } from "@/utils/logger";

dotenv.config();

const prisma = new PrismaClient();

async function undoSeed() {
  try {
    // Kiểm tra DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL không được định nghĩa trong .env');
    }
    
    logger.info("Bắt đầu undo seeding dữ liệu...");
    
    /**
     * Xóa dữ liệu theo thứ tự ngược lại với dependencies
     * Xóa từ tables có foreign key trước, sau đó đến parent tables
     */
    
    // 1. Xóa dữ liệu có many-to-many và foreign keys phức tạp
    logger.info("🗑️  Đang xóa Screen_Controls...");
    await prisma.screenControl.deleteMany({});
    
    logger.info("🗑️  Đang xóa Class_Videos...");
    await prisma.classVideo.deleteMany({});
    
    logger.info("🗑️  Đang xóa Awards...");
    await prisma.award.deleteMany({});
    
    logger.info("🗑️  Đang xóa Rescues...");
    await prisma.rescue.deleteMany({});
    
    logger.info("🗑️  Đang xóa Results...");
    await prisma.result.deleteMany({});
    
    logger.info("🗑️  Đang xóa Contestant_Matches...");
    await prisma.contestantMatch.deleteMany({});
    
    // 2. Xóa dữ liệu phụ thuộc vào matches và contestants
    logger.info("🗑️  Đang xóa Groups...");
    await prisma.group.deleteMany({});
    
    logger.info("🗑️  Đang xóa Contestants...");
    await prisma.contestant.deleteMany({});
    
    // 3. Xóa matches và rounds
    logger.info("🗑️  Đang xóa Matches...");
    await prisma.match.deleteMany({});
    
    logger.info("🗑️  Đang xóa Rounds...");
    await prisma.round.deleteMany({});
    
    // 4. Xóa contests
    logger.info("🗑️  Đang xóa Contests...");
    await prisma.contest.deleteMany({});
    
    // 5. Xóa question related data
    logger.info("🗑️  Đang xóa Question_Details...");
    await prisma.questionDetail.deleteMany({});
    
    logger.info("🗑️  Đang xóa Questions...");
    await prisma.question.deleteMany({});
    
    logger.info("🗑️  Đang xóa Question_Packages...");
    await prisma.questionPackage.deleteMany({});
    
    logger.info("🗑️  Đang xóa Question_Topics...");
    await prisma.questionTopic.deleteMany({});
    
    // 6. Xóa students và classes
    logger.info("🗑️  Đang xóa Students...");
    await prisma.student.deleteMany({});
    
    logger.info("🗑️  Đang xóa Classes...");
    await prisma.class.deleteMany({});
    
    logger.info("🗑️  Đang xóa Schools...");
    await prisma.school.deleteMany({});
    
    // 7. Xóa dữ liệu cơ bản (không có dependencies)
    logger.info("🗑️  Đang xóa Sponsors...");
    await prisma.sponsor.deleteMany({});
    
    logger.info("🗑️  Đang xóa About...");
    await prisma.about.deleteMany({});
    
    logger.info("🗑️  Đang xóa Users...");
    await prisma.user.deleteMany({});

    logger.info("✅ Hoàn tất undo seeding tất cả dữ liệu thành công!");
    
    // Reset auto-increment counters (optional)
    logger.info("🔄 Đang reset auto-increment counters...");
    
    // Lấy danh sách tất cả các bảng
    const tables = [
      'Users', 'Schools', 'Classes', 'Students', 'About', 'Question_Topics',
      'Question_Packages', 'Questions', 'Question_Details', 'Contests', 'Rounds',
      'Matches', 'Groups', 'Contestants', 'Contestant_Matches', 'Results',
      'Rescues', 'Awards', 'Sponsors', 'Class_Videos', 'Screen_Controls'
    ];
    
    // Reset auto-increment cho từng bảng (MySQL)
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        logger.info(`✅ Reset auto-increment cho bảng ${table}`);
      } catch (error) {
        logger.warn(`⚠️  Không thể reset auto-increment cho bảng ${table}:`, error);
      }
    }
    
    logger.info("🎉 Undo seeding hoàn tất!");
    
  } catch (error) {
    logger.error("❌ Lỗi trong quá trình undo seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Thêm confirmation prompt để tránh xóa nhầm
async function confirmUndo(): Promise<boolean> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('⚠️  CẢNH BÁO: Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu seed? (y/N): ', (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Main execution với confirmation
async function main() {
  // Kiểm tra nếu chạy với flag --force thì bỏ qua confirmation
  const forceMode = process.argv.includes('--force');
  
  if (!forceMode) {
    const confirmed = await confirmUndo();
    if (!confirmed) {
      logger.info("👋 Hủy bỏ undo seeding.");
      process.exit(0);
    }
  }
  
  await undoSeed();
}

main();
