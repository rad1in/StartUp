-- Per-venue schedule for automated periodic financial reports, plus the
-- generated report snapshots themselves (so past reports stay available
-- for download even as underlying order data ages/changes).
CREATE TABLE IF NOT EXISTS `FinancialReportSchedule` (
  `venueId` CHAR(36) PRIMARY KEY,
  `frequency` ENUM('WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'WEEKLY',
  `isActive` TINYINT(1) NOT NULL DEFAULT 0,
  `lastGeneratedAt` DATETIME NULL,
  CONSTRAINT `fk_finreportsched_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `FinancialReport` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `periodStart` DATETIME NOT NULL,
  `periodEnd` DATETIME NOT NULL,
  `frequency` ENUM('WEEKLY', 'MONTHLY') NOT NULL,
  `summaryJson` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_finreport_venue` (`venueId`),
  CONSTRAINT `fk_finreport_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
