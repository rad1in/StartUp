-- Staff shift scheduling + clock-in/out. A Shift is a planned work period for
-- one staff member; clockInAt/clockOutAt are filled in by the staff member
-- themselves (self-service), separate from the owner-authored schedule.
CREATE TABLE IF NOT EXISTS `Shift` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `scheduledStart` DATETIME NOT NULL,
  `scheduledEnd` DATETIME NOT NULL,
  `note` VARCHAR(255) NULL,
  `clockInAt` DATETIME NULL,
  `clockOutAt` DATETIME NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_shift_venue` (`venueId`),
  INDEX `idx_shift_user` (`userId`),
  INDEX `idx_shift_scheduled_start` (`scheduledStart`),
  CONSTRAINT `fk_shift_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
