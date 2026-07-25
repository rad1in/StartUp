-- Expo push tokens for the mobile app (separate from PushSubscription, which
-- holds Web Push subscriptions for the browser). Sending to both tables from
-- the same notification fan-out point covers web + mobile with one call.
CREATE TABLE IF NOT EXISTS `ExpoPushToken` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `deviceInfo` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_expo_token` (`token`),
  INDEX `idx_expo_push_user` (`userId`),
  CONSTRAINT `fk_expo_push_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
