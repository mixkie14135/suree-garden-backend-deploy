-- CreateTable
CREATE TABLE `admin` (
    `admin_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `username`(`username`),
    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banquet_room` (
    `banquet_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `price_per_hour` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('available', 'occupied', 'maintenance') NULL DEFAULT 'available',
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`banquet_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banquet_image` (
    `image_id` INTEGER NOT NULL AUTO_INCREMENT,
    `banquet_id` INTEGER NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `banquet_id`(`banquet_id`),
    PRIMARY KEY (`image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `customer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_customer_phone`(`phone`),
    PRIMARY KEY (`customer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_type` (
    `room_type_id` INTEGER NOT NULL AUTO_INCREMENT,
    `type_name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`room_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room` (
    `room_id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_number` VARCHAR(10) NOT NULL,
    `room_type_id` INTEGER NOT NULL,
    `capacity` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('available', 'occupied', 'maintenance') NULL DEFAULT 'available',
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `room_number`(`room_number`),
    INDEX `room_type_id`(`room_type_id`),
    PRIMARY KEY (`room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_image` (
    `image_id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `room_id`(`room_id`),
    PRIMARY KEY (`image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_room` (
    `reservation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `checkin_date` DATE NOT NULL,
    `checkout_date` DATE NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled', 'checked_in', 'checked_out') NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_id`(`customer_id`),
    INDEX `idx_res_room_status`(`status`),
    INDEX `idx_room_dates`(`room_id`, `checkin_date`, `checkout_date`),
    INDEX `room_id`(`room_id`),
    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_banquet` (
    `reservation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `banquet_id` INTEGER NOT NULL,
    `event_date` DATE NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `banquet_id`(`banquet_id`),
    INDEX `customer_id`(`customer_id`),
    INDEX `idx_banquet_datetime`(`banquet_id`, `event_date`, `start_time`, `end_time`),
    INDEX `idx_res_banquet_status`(`status`),
    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_room` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('bank_transfer', 'promptpay') NOT NULL,
    `payment_status` ENUM('unpaid', 'pending', 'confirmed', 'rejected') NULL DEFAULT 'unpaid',
    `paid_at` TIMESTAMP(0) NULL,
    `slip_image_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_pay_room`(`reservation_id`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_banquet` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservation_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('bank_transfer', 'promptpay') NOT NULL,
    `payment_status` ENUM('unpaid', 'pending', 'confirmed', 'rejected') NULL DEFAULT 'unpaid',
    `paid_at` TIMESTAMP(0) NULL,
    `slip_image_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_pay_banquet`(`reservation_id`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `banquet_image` ADD CONSTRAINT `banquet_image_ibfk_1` FOREIGN KEY (`banquet_id`) REFERENCES `banquet_room`(`banquet_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`room_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `room_image` ADD CONSTRAINT `room_image_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `room`(`room_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `room`(`room_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservation_banquet` ADD CONSTRAINT `reservation_banquet_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reservation_banquet` ADD CONSTRAINT `reservation_banquet_ibfk_2` FOREIGN KEY (`banquet_id`) REFERENCES `banquet_room`(`banquet_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_room` ADD CONSTRAINT `fk_payment_room_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservation_room`(`reservation_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_banquet` ADD CONSTRAINT `fk_payment_banquet_res` FOREIGN KEY (`reservation_id`) REFERENCES `reservation_banquet`(`reservation_id`) ON DELETE CASCADE ON UPDATE NO ACTION;
