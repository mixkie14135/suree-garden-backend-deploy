/*
  Warnings:

  - Made the column `slug` on table `room_type` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `room_type` MODIFY `slug` VARCHAR(100) NOT NULL;
