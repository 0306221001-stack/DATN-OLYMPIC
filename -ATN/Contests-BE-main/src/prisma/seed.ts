import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { logger } from "@/utils/logger";
import seedUsers from "@/prisma/seeders/users.seed";
import seedAbout from "@/prisma/seeders/about.seed";
import seedSchools from "@/prisma/seeders/schools.seed";
import seedClasses from "@/prisma/seeders/classes.seed";
import seedStudents from "@/prisma/seeders/students.seed";
import seedQuestionTopics from "@/prisma/seeders/questionTopics.seed";
import seedQuestionPackages from "@/prisma/seeders/questionPackages.seed";
import seedQuestions from "@/prisma/seeders/questions.seed";
import seedQuestionDetails from "@/prisma/seeders/questionDetails.seed";
import seedContests from "@/prisma/seeders/contests.seed";
import seedRounds from "@/prisma/seeders/rounds.seed";
import seedMatches from "@/prisma/seeders/matches.seed";
import seedGroups from "@/prisma/seeders/groups.seed";
import seedContestants from "@/prisma/seeders/contestants.seed";
import seedContestantMatches from "@/prisma/seeders/contestantMatches.seed";
import seedClassVideos from "@/prisma/seeders/classVideos.seed";
import seedAwards from "@/prisma/seeders/awards.seed";
import seedSponsors from "@/prisma/seeders/sponsors.seed";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    // Kiểm tra DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL không được định nghĩa trong .env");
    }

    logger.info("Bắt đầu seeding dữ liệu...");

    /**
     * Seeding dữ liệu theo thứ tự phụ thuộc
     */

    // 1. Seed dữ liệu cơ bản (không phụ thuộc)
    await seedUsers({ prisma, logger, env: process.env });
    await seedAbout({ prisma, logger, env: process.env });
    await seedSponsors({ prisma, logger, env: process.env });

    // 2. Seed trường học và lớp học
    await seedSchools({ prisma, logger, env: process.env });
    await seedClasses({ prisma, logger, env: process.env });
    await seedStudents({ prisma, logger, env: process.env });
    // 3. Seed câu hỏi và chủ đề
    await seedQuestionTopics({ prisma, logger, env: process.env });
    await seedQuestionPackages({ prisma, logger, env: process.env });
    await seedQuestions({ prisma, logger, env: process.env });
    await seedQuestionDetails({ prisma, logger, env: process.env });

    // 4. Seed cuộc thi và vòng thi
    await seedContests({ prisma, logger, env: process.env });
    await seedRounds({ prisma, logger, env: process.env });
    await seedMatches({ prisma, logger, env: process.env });

    // 5. Seed thí sinh và nhóm thi đấu
    await seedContestants({ prisma, logger, env: process.env });
    await seedGroups({ prisma, logger, env: process.env });
    await seedContestantMatches({ prisma, logger, env: process.env });

    // 6. Seed dữ liệu bổ sung
    await seedClassVideos({ prisma, logger, env: process.env });
    await seedAwards({ prisma, logger, env: process.env });

    logger.info("Hoàn tất seeding tất cả dữ liệu thành công!");
  } catch (error) {
    logger.error("Lỗi trong quá trình seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
