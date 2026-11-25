/*
  Warnings:

  - The values [fourthPrize,impressiveVideo,excellentVideo] on the enum `awards_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `awards` ADD COLUMN `match_id` INTEGER NULL,
    MODIFY `type` ENUM('firstPrize', 'secondPrize', 'thirdPrize') NOT NULL;

-- AlterTable
ALTER TABLE `rescues` MODIFY `index` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `awards` ADD CONSTRAINT `awards_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
