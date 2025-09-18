/*
  Warnings:

  - You are about to drop the column `email` on the `reservation_room` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `reservation_room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `reservation_room` DROP COLUMN `email`,
    DROP COLUMN `phone`,
    ADD COLUMN `contact_email` VARCHAR(191) NULL,
    ADD COLUMN `contact_name` VARCHAR(191) NULL,
    ADD COLUMN `contact_phone` VARCHAR(191) NULL;
