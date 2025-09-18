/*
  Warnings:

  - You are about to drop the column `email` on the `reservation_banquet` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `reservation_banquet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `reservation_banquet` DROP COLUMN `email`,
    DROP COLUMN `phone`;
