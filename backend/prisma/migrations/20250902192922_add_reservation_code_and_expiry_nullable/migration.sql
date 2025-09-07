-- AlterTable
ALTER TABLE `reservation_banquet` ADD COLUMN `expires_at` TIMESTAMP(0) NULL,
    ADD COLUMN `reservation_code` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `reservation_room` ADD COLUMN `expires_at` TIMESTAMP(0) NULL,
    ADD COLUMN `reservation_code` VARCHAR(20) NULL;
