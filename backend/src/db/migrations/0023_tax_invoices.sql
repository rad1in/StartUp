-- Standard-format electronic tax invoice (سامانه مودیان). Structure only —
-- no live submission to a مودیان-compliant gateway yet (per product
-- decision); taxUid/submittedAt are placeholders for when a real provider
-- (چاپار/سپیدار/جیرینگ/direct tax-org API) is wired up later.
ALTER TABLE `Venue` ADD COLUMN `economicCode` VARCHAR(50) NULL AFTER `smsCredit`;
ALTER TABLE `Venue` ADD COLUMN `legalName` VARCHAR(255) NULL AFTER `economicCode`;
ALTER TABLE `Venue` ADD COLUMN `nationalId` VARCHAR(50) NULL AFTER `legalName`;
ALTER TABLE `Venue` ADD COLUMN `postalCode` VARCHAR(20) NULL AFTER `nationalId`;

CREATE TABLE `TaxInvoice` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `serialNumber` INT NOT NULL,
  `issueDate` DATETIME NOT NULL,
  `sellerEconomicCode` VARCHAR(50) NULL,
  `sellerLegalName` VARCHAR(255) NULL,
  `buyerName` VARCHAR(255) NULL,
  `buyerNationalId` VARCHAR(50) NULL,
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `discountTotal` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `vatRate` DECIMAL(5,2) NOT NULL DEFAULT 9.00,
  `vatAmount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `totalAmount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `status` ENUM('ISSUED','SUBMITTED','FAILED') NOT NULL DEFAULT 'ISSUED',
  `taxUid` VARCHAR(100) NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_taxinvoice_venue_serial (`venueId`, `serialNumber`),
  UNIQUE KEY uq_taxinvoice_order (`orderId`),
  INDEX idx_taxinvoice_venue (`venueId`),
  CONSTRAINT `fk_taxinvoice_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_taxinvoice_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE
);
