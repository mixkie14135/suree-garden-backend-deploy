/*
  Warnings:

  - A unique constraint covering the columns `[reservation_code]` on the table `reservation_banquet` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reservation_code]` on the table `reservation_room` will be added. If there are existing duplicate values, this will fail.
  - Made the column `reservation_code` on table `reservation_banquet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reservation_code` on table `reservation_room` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `reservation_banquet` MODIFY `reservation_code` VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE `reservation_room` MODIFY `reservation_code` VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `reservation_banquet_reservation_code_key` ON `reservation_banquet`(`reservation_code`);

-- CreateIndex
CREATE UNIQUE INDEX `reservation_room_reservation_code_key` ON `reservation_room`(`reservation_code`);
