/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `room_type` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `room_type` ADD COLUMN `amenities` JSON NULL,
    ADD COLUMN `slug` VARCHAR(100) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `room_type_slug_key` ON `room_type`(`slug`);
