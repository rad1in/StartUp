-- Multi-step approval pipeline for newly-registered venues, replacing the
-- single approve/reject action with sequential stages an admin works through.
CREATE TABLE IF NOT EXISTS `VenueApprovalStage` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `stageKey` VARCHAR(40) NOT NULL,
  `stageOrder` TINYINT NOT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `note` VARCHAR(500) NULL,
  `completedBy` CHAR(36) NULL,
  `completedAt` DATETIME NULL,
  UNIQUE KEY `uq_venueapproval_venue_stage` (`venueId`, `stageKey`),
  INDEX `idx_venueapproval_venue` (`venueId`),
  CONSTRAINT `fk_venueapproval_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
