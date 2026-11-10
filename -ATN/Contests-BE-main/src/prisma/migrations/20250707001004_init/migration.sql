-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` CHAR(255) NOT NULL,
    `password` CHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` ENUM('Admin', 'Judge', 'Student') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `token` TEXT NULL,
    `otpCode` VARCHAR(6) NULL,
    `otpExpiredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refreshtokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `refreshToken` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiredAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schools` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(10) NULL,
    `address` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `schools_email_key`(`email`),
    UNIQUE INDEX `schools_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `schoolId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(255) NOT NULL,
    `student_code` VARCHAR(12) NULL,
    `avatar` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `classId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `about` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `schoolName` VARCHAR(255) NOT NULL,
    `website` VARCHAR(255) NULL,
    `departmentName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `fanpage` VARCHAR(255) NULL,
    `mapEmbedCode` TEXT NULL,
    `logo` JSON NULL,
    `banner` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_Topics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_Packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `intro` VARCHAR(255) NULL,
    `defaultTime` INTEGER NOT NULL,
    `questionType` ENUM('multiple_choice', 'essay', 'image', 'audio', 'video') NOT NULL,
    `content` TEXT NOT NULL,
    `questionMedia` JSON NULL,
    `options` JSON NULL,
    `correctAnswer` TEXT NOT NULL,
    `mediaAnswer` JSON NULL,
    `score` INTEGER NOT NULL DEFAULT 1,
    `difficulty` ENUM('Alpha', 'Beta', 'Rc', 'Gold') NOT NULL,
    `explanation` TEXT NULL,
    `questionTopicId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_Details` (
    `questionId` INTEGER NOT NULL,
    `questionPackageId` INTEGER NOT NULL,
    `questionOrder` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`questionId`, `questionPackageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `rule` TEXT NOT NULL,
    `plainText` TEXT NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `slogan` VARCHAR(255) NULL,
    `status` ENUM('upcoming', 'ongoing', 'finished') NOT NULL DEFAULT 'upcoming',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contests_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(255) NOT NULL,
    `type` ENUM('logo', 'background', 'images') NOT NULL,
    `contestId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rounds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `index` INTEGER NOT NULL,
    `contestId` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `slug` VARCHAR(191) NULL,
    `remainingTime` INTEGER NULL,
    `status` ENUM('upcoming', 'ongoing', 'finished') NOT NULL DEFAULT 'upcoming',
    `currentQuestion` INTEGER NOT NULL,
    `questionPackageId` INTEGER NOT NULL,
    `contestId` INTEGER NOT NULL,
    `roundId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `studentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `matches_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `userId` INTEGER NULL,
    `matchId` INTEGER NOT NULL,
    `confirmCurrentQuestion` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contestants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contestId` INTEGER NOT NULL,
    `studentId` INTEGER NOT NULL,
    `roundId` INTEGER NOT NULL,
    `status` ENUM('compete', 'eliminate', 'advanced') NOT NULL DEFAULT 'compete',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contestant_Matches` (
    `contestantId` INTEGER NOT NULL,
    `matchId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    `registrationNumber` INTEGER NOT NULL,
    `status` ENUM('not_started', 'in_progress', 'confirmed1', 'confirmed2', 'eliminated', 'rescued', 'banned', 'completed') NOT NULL DEFAULT 'not_started',
    `eliminatedAtQuestionOrder` INTEGER NULL,
    `rescuedAtQuestionOrder` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`contestantId`, `matchId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contestant_id` INTEGER NOT NULL,
    `match_id` INTEGER NOT NULL,
    `isCorrect` BOOLEAN NOT NULL DEFAULT true,
    `questionOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rescues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `rescueType` ENUM('resurrected', 'lifelineUsed') NOT NULL,
    `questionFrom` INTEGER NOT NULL,
    `questionTo` INTEGER NOT NULL,
    `studentIds` JSON NULL,
    `supportAnswers` JSON NULL,
    `remainingContestants` INTEGER NOT NULL,
    `questionOrder` INTEGER NULL,
    `index` INTEGER NOT NULL,
    `status` ENUM('notUsed', 'used', 'passed', 'notEligible', 'proposed') NOT NULL,
    `match_id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `awards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contest_id` INTEGER NOT NULL,
    `contestant_id` INTEGER NULL,
    `type` ENUM('firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `images` VARCHAR(255) NULL,
    `videos` VARCHAR(255) NOT NULL,
    `contestId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `class_Videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slogan` VARCHAR(255) NULL,
    `classId` INTEGER NOT NULL,
    `contestId` INTEGER NULL,
    `videos` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `screen_controls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `controlKey` ENUM('wingold', 'qrcode', 'background', 'question', 'questionIntro', 'questionInfo', 'answer', 'matchDiagram', 'explanation', 'firstPrize', 'secondPrize', 'thirdPrize', 'fourthPrize', 'impressiveVideo', 'excellentVideo', 'allPrize', 'topWin', 'listEliminated', 'listRescued', 'video', 'audio', 'image', 'chart') NOT NULL DEFAULT 'background',
    `controlValue` ENUM('start', 'pause', 'reset', 'Eliminated', 'Rescued') NULL,
    `matchId` INTEGER NOT NULL,
    `media` VARCHAR(255) NULL,
    `value` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `screen_controls_matchId_key`(`matchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refreshtokens` ADD CONSTRAINT `refreshtokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_questionTopicId_fkey` FOREIGN KEY (`questionTopicId`) REFERENCES `question_Topics`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `question_Details` ADD CONSTRAINT `question_Details_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `question_Details` ADD CONSTRAINT `question_Details_questionPackageId_fkey` FOREIGN KEY (`questionPackageId`) REFERENCES `question_Packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rounds` ADD CONSTRAINT `rounds_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_questionPackageId_fkey` FOREIGN KEY (`questionPackageId`) REFERENCES `question_Packages`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `rounds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestants` ADD CONSTRAINT `contestants_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestants` ADD CONSTRAINT `contestants_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestants` ADD CONSTRAINT `contestants_roundId_fkey` FOREIGN KEY (`roundId`) REFERENCES `rounds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestant_Matches` ADD CONSTRAINT `contestant_Matches_contestantId_fkey` FOREIGN KEY (`contestantId`) REFERENCES `contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestant_Matches` ADD CONSTRAINT `contestant_Matches_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contestant_Matches` ADD CONSTRAINT `contestant_Matches_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `results` ADD CONSTRAINT `results_contestant_id_fkey` FOREIGN KEY (`contestant_id`) REFERENCES `contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `results` ADD CONSTRAINT `results_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rescues` ADD CONSTRAINT `rescues_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `awards` ADD CONSTRAINT `awards_contest_id_fkey` FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `awards` ADD CONSTRAINT `awards_contestant_id_fkey` FOREIGN KEY (`contestant_id`) REFERENCES `contestants`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `sponsors` ADD CONSTRAINT `sponsors_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `class_Videos` ADD CONSTRAINT `class_Videos_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `class_Videos` ADD CONSTRAINT `class_Videos_contestId_fkey` FOREIGN KEY (`contestId`) REFERENCES `contests`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `screen_controls` ADD CONSTRAINT `screen_controls_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
