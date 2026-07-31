-- Reservation waitlist — when a venue has no free tables for a requested
-- time, a customer can join a waitlist instead of just being turned away.
-- When an existing reservation for that venue is cancelled, the earliest
-- waiting entry near that time is automatically notified that a table opened
-- up (see reservations/service.js's updateReservationStatus).
CREATE TABLE `ReservationWaitlist` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `customerId` CHAR(36) NULL,
  `guestName` VARCHAR(255) NOT NULL,
  `guestPhone` VARCHAR(32) NOT NULL,
  `partySize` INT NOT NULL DEFAULT 2,
  `requestedTime` DATETIME NOT NULL,
  `notes` VARCHAR(500) NULL,
  `status` ENUM('WAITING','NOTIFIED','CONVERTED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_resw_venue` (`venueId`),
  INDEX `idx_resw_time` (`requestedTime`),
  CONSTRAINT `fk_resw_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_resw_customer` FOREIGN KEY (`customerId`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;
