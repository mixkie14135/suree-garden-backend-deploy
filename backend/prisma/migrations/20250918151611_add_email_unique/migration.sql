/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `customer` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `customer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `customer` MODIFY `email` VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `customer_email_key` ON `customer`(`email`);
