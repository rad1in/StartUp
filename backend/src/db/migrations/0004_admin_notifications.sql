-- Internal alert feed for the platform admin team (critical fraud flags, new
-- venue registrations needing approval, high/critical tickets). Global, not
-- per-admin — any admin marking it read clears it for the whole team, which
-- matches how a small trusted ops team actually works.
CREATE TABLE IF NOT EXISTS `AdminNotification` (
  `id` CHAR(36) PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` VARCHAR(500) NULL,
  `severity` ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
  `link` VARCHAR(255) NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_adminnotification_isread` (`isRead`)
) ENGINE=InnoDB;
