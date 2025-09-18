/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `customer` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phone` on table `customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `customer` MODIFY `phone` VARCHAR(20) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `customer_phone_key` ON `customer`(`phone`);
