/*
  Warnings:

  - You are about to drop the column `payment_method` on the `payment_banquet` table. All the data in the column will be lost.
  - You are about to drop the column `slip_image_url` on the `payment_banquet` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `payment_room` table. All the data in the column will be lost.
  - You are about to drop the column `slip_image_url` on the `payment_room` table. All the data in the column will be lost.
  - Made the column `payment_status` on table `payment_banquet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `payment_status` on table `payment_room` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `payment_banquet` DROP FOREIGN KEY `fk_payment_banquet_res`;

-- DropForeignKey
ALTER TABLE `payment_room` DROP FOREIGN KEY `fk_payment_room_res`;

-- AlterTable
ALTER TABLE `payment_banquet` DROP COLUMN `payment_method`,
    DROP COLUMN `slip_image_url`,
    ADD COLUMN `gateway_provider` VARCHAR(191) NULL,
    ADD COLUMN `gateway_raw` JSON NULL,
    ADD COLUMN `gateway_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `method` ENUM('bank_transfer', 'promptpay') NOT NULL DEFAULT 'bank_transfer',
    ADD COLUMN `payer_bank` VARCHAR(191) NULL,
    ADD COLUMN `payer_name` VARCHAR(191) NULL,
    ADD COLUMN `slip_url` VARCHAR(191) NULL,
    ADD COLUMN `transfer_ref` VARCHAR(191) NULL,
    ADD COLUMN `transfer_time` DATETIME(3) NULL,
    MODIFY `payment_status` ENUM('unpaid', 'pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending',
    MODIFY `paid_at` DATETIME(3) NULL,
    MODIFY `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `payment_room` DROP COLUMN `payment_method`,
    DROP COLUMN `slip_image_url`,
    ADD COLUMN `gateway_provider` VARCHAR(191) NULL,
    ADD COLUMN `gateway_raw` JSON NULL,
    ADD COLUMN `gateway_txn_id` VARCHAR(191) NULL,
    ADD COLUMN `method` ENUM('bank_transfer', 'promptpay') NOT NULL DEFAULT 'bank_transfer',
    ADD COLUMN `payer_bank` VARCHAR(191) NULL,
    ADD COLUMN `payer_name` VARCHAR(191) NULL,
    ADD COLUMN `slip_url` VARCHAR(191) NULL,
    ADD COLUMN `transfer_ref` VARCHAR(191) NULL,
    ADD COLUMN `transfer_time` DATETIME(3) NULL,
    MODIFY `payment_status` ENUM('unpaid', 'pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending',
    MODIFY `paid_at` DATETIME(3) NULL,
    MODIFY `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `reservation_banquet` ADD COLUMN `pay_account_snapshot` JSON NULL,
    ADD COLUMN `payment_due_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `reservation_room` ADD COLUMN `pay_account_snapshot` JSON NULL,
    ADD COLUMN `payment_due_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `bank_account` (
    `bank_account_id` INTEGER NOT NULL AUTO_INCREMENT,
    `bank_name` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `promptpay_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bank_account_is_active_is_default_idx`(`is_active`, `is_default`),
    UNIQUE INDEX `bank_account_account_number_key`(`account_number`),
    PRIMARY KEY (`bank_account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payment_banquet_reservation_id_payment_status_idx` ON `payment_banquet`(`reservation_id`, `payment_status`);

-- CreateIndex
CREATE INDEX `payment_room_reservation_id_payment_status_idx` ON `payment_room`(`reservation_id`, `payment_status`);

-- AddForeignKey
ALTER TABLE `payment_room` ADD CONSTRAINT `payment_room_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservation_room`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_banquet` ADD CONSTRAINT `payment_banquet_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservation_banquet`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;
