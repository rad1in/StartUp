-- Venue-run SMS marketing campaigns: admin-approval gated, priced per
-- subscription tier, paid out of a prepaid smsCredit balance (topped up via
-- the existing multi-gateway payment system, same pattern as wallet/service.js).
ALTER TABLE `Venue` ADD COLUMN `smsCredit` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `commissionRate`;

CREATE TABLE `SmsCampaign` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` VARCHAR(500) NOT NULL,
  `recipientCount` INT NOT NULL DEFAULT 0,
  `pricePerMessage` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `totalCost` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` ENUM('PENDING','APPROVED','REJECTED','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `rejectionReason` VARCHAR(300) NULL,
  `sentCount` INT NULL,
  `reviewedBy` CHAR(36) NULL,
  `reviewedAt` DATETIME NULL,
  `sentAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE CASCADE,
  INDEX idx_smscampaign_venue (`venueId`),
  INDEX idx_smscampaign_status (`status`)
);

CREATE TABLE `SmsCreditTransaction` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `type` ENUM('TOPUP','SPEND','REFUND') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balanceAfter` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'SUCCESS',
  `providerRef` VARCHAR(191) NULL,
  `provider` VARCHAR(50) NULL,
  `campaignId` CHAR(36) NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`venueId`) REFERENCES `Venue`(`id`) ON DELETE CASCADE,
  INDEX idx_smscredittx_venue (`venueId`)
);
