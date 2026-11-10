import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { logger } from "@/utils/logger";

dotenv.config();

const prisma = new PrismaClient();

// Định nghĩa thứ tự xóa các bảng (ngược lại với dependencies)
const DELETE_ORDER = [
  'screenControls',
  'classVideos', 
  'awards',
  'rescues',
  'results',
  'contestantMatches',
  'groups',
  'contestants',
  'matches',
  'rounds',
  'contests',
  'questionDetails',
  'questions',
  'questionPackages',
  'questionTopics',
  'students',
  'classes',
  'schools',
  'sponsors',
  'about',
  'users'
] as const;

// Mapping tên bảng tiếng Việt
const TABLE_NAMES: Record<string, string> = {
  screenControls: 'Screen_Controls',
  classVideos: 'Class_Videos',
  awards: 'Awards',
  rescues: 'Rescues',
  results: 'Results',
  contestantMatches: 'Contestant_Matches',
  groups: 'Groups',
  contestants: 'Contestants',
  matches: 'Matches',
  rounds: 'Rounds',
  contests: 'Contests',
  questionDetails: 'Question_Details',
  questions: 'Questions',
  questionPackages: 'Question_Packages',
  questionTopics: 'Question_Topics',
  students: 'Students',
  classes: 'Classes',
  schools: 'Schools',
  sponsors: 'Sponsors',
  about: 'About',
  users: 'Users'
};

// Mapping prisma methods
const PRISMA_METHODS: Record<string, any> = {
  screenControls: prisma.screenControl,
  classVideos: prisma.classVideo,
  awards: prisma.award,
  rescues: prisma.rescue,
  results: prisma.result,
  contestantMatches: prisma.contestantMatch,
  groups: prisma.group,
  contestants: prisma.contestant,
  matches: prisma.match,
  rounds: prisma.round,
  contests: prisma.contest,
  questionDetails: prisma.questionDetail,
  questions: prisma.question,
  questionPackages: prisma.questionPackage,
  questionTopics: prisma.questionTopic,
  students: prisma.student,
  classes: prisma.class,
  schools: prisma.school,
  sponsors: prisma.sponsor,
  about: prisma.about,
  users: prisma.user
};

async function undoSeedAll() {
  logger.info("🗑️  Bắt đầu xóa TẤT CẢ dữ liệu seed...");
  
  for (const table of DELETE_ORDER) {
    await deleteTable(table);
  }
  
  await resetAutoIncrement();
  logger.info("✅ Hoàn tất undo seeding tất cả dữ liệu!");
}

async function undoSeedSpecific(tables: string[]) {
  logger.info(`🗑️  Bắt đầu xóa dữ liệu từ các bảng: ${tables.join(', ')}...`);
  
  // Sắp xếp các bảng theo thứ tự xóa đúng
  const sortedTables = DELETE_ORDER.filter(table => tables.includes(table));
  
  for (const table of sortedTables) {
    await deleteTable(table);
  }
  
  logger.info("✅ Hoàn tất undo seeding các bảng được chỉ định!");
}

async function deleteTable(table: string) {
  try {
    const method = PRISMA_METHODS[table];
    if (!method) {
      logger.warn(`⚠️  Không tìm thấy phương thức cho bảng: ${table}`);
      return;
    }
    
    const count = await method.count();
    if (count === 0) {
      logger.info(`⏭️  Bảng ${TABLE_NAMES[table]} đã trống, bỏ qua...`);
      return;
    }
    
    logger.info(`🗑️  Đang xóa ${count} records từ bảng ${TABLE_NAMES[table]}...`);
    const result = await method.deleteMany({});
    logger.info(`✅ Đã xóa ${result.count || count} records từ bảng ${TABLE_NAMES[table]}`);
  } catch (error) {
    logger.error(`❌ Lỗi khi xóa bảng ${TABLE_NAMES[table]}:`, error);
    throw error;
  }
}

async function resetAutoIncrement() {
  logger.info("🔄 Đang reset auto-increment counters...");
  
  const tableNames = Object.values(TABLE_NAMES);
  
  for (const tableName of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
      logger.info(`✅ Reset auto-increment cho bảng ${tableName}`);
    } catch (error) {
      logger.warn(`⚠️  Không thể reset auto-increment cho bảng ${tableName}`);
    }
  }
}

async function showHelp() {
  console.log(`
🔧 Contest Backend - Undo Seed Tool

Cách sử dụng:
  npm run prisma:undo-seed                    # Xóa tất cả dữ liệu (có confirmation)
  npm run prisma:undo-seed-force              # Xóa tất cả dữ liệu (không confirmation)
  
Hoặc sử dụng trực tiếp:
  ts-node prisma/undo-seed.ts                 # Xóa tất cả dữ liệu (có confirmation)
  ts-node prisma/undo-seed.ts --force         # Xóa tất cả dữ liệu (không confirmation)
  ts-node prisma/undo-seed.ts --tables users,schools,classes
                                              # Xóa các bảng cụ thể
  ts-node prisma/undo-seed.ts --help          # Hiển thị help

Các bảng có thể xóa:
${Object.keys(TABLE_NAMES).map(key => `  - ${key} (${TABLE_NAMES[key]})`).join('\n')}

⚠️  CẢNH BÁO: Thao tác này sẽ xóa dữ liệu vĩnh viễn!
  `);
}

async function confirmUndo(): Promise<boolean> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('⚠️  CẢNH BÁO: Bạn có chắc chắn muốn xóa dữ liệu seed? (y/N): ', (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  try {
    // Kiểm tra DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL không được định nghĩa trong .env');
    }
    
    const args = process.argv.slice(2);
    
    // Show help
    if (args.includes('--help') || args.includes('-h')) {
      await showHelp();
      process.exit(0);
    }
    
    // Parse arguments
    const forceMode = args.includes('--force');
    const tablesIndex = args.findIndex(arg => arg === '--tables');
    const specificTables = tablesIndex !== -1 && args[tablesIndex + 1] 
      ? args[tablesIndex + 1]?.split(',').map(s => s.trim()) || null
      : null;
    
    // Validation for specific tables
    if (specificTables) {
      const invalidTables = specificTables.filter(table => !Object.keys(TABLE_NAMES).includes(table));
      if (invalidTables.length > 0) {
        logger.error(`❌ Các bảng không hợp lệ: ${invalidTables.join(', ')}`);
        logger.info('Sử dụng --help để xem danh sách bảng hợp lệ');
        process.exit(1);
      }
    }
    
    // Confirmation (skip if force mode or specific tables)
    if (!forceMode && !specificTables) {
      const confirmed = await confirmUndo();
      if (!confirmed) {
        logger.info("👋 Hủy bỏ undo seeding.");
        process.exit(0);
      }
    }
    
    logger.info("🚀 Bắt đầu undo seeding dữ liệu...");
    
    // Execute undo
    if (specificTables) {
      await undoSeedSpecific(specificTables);
    } else {
      await undoSeedAll();
    }
    
    logger.info("🎉 Undo seeding hoàn tất!");
    
  } catch (error) {
    logger.error("❌ Lỗi trong quá trình undo seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
