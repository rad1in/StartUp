CREATE TABLE IF NOT EXISTS `ScheduledBroadcast` (
  `id` CHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `body` VARCHAR(1000) NOT NULL,
  `audience` VARCHAR(20) NOT NULL,
  `scheduledAt` DATETIME NOT NULL,
  `status` ENUM('PENDING','SENT','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `createdBy` CHAR(36) NULL,
  `sentAt` DATETIME NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_scheduledbroadcast_due` (`status`, `scheduledAt`)
) ENGINE=InnoDB;
