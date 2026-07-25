-- Venue-specific prepaid bundles ("punch cards") — e.g. "buy 10 coffees, pay
-- for 8". The owner defines the deal once (VenuePunchCardPlan); a customer
-- who buys it gets a VenueCustomerPunchCard tracking remaining credits, which
-- can be redeemed against a specific menu item (or any item, if unset) at
-- checkout instead of paying cash for that line.
CREATE TABLE IF NOT EXISTS `VenuePunchCardPlan` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `menuItemId` CHAR(36) NULL,
  `name` VARCHAR(255) NOT NULL,
  `totalCredits` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_punchcardplan_venue` (`venueId`),
  CONSTRAINT `fk_punchcardplan_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_punchcardplan_item` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `VenueCustomerPunchCard` (
  `id` CHAR(36) PRIMARY KEY,
  `planId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `remainingCredits` INT NOT NULL,
  `purchasedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_customerpunchcard_user` (`userId`, `venueId`),
  CONSTRAINT `fk_customerpunchcard_plan` FOREIGN KEY (`planId`) REFERENCES `VenuePunchCardPlan` (`id`),
  CONSTRAINT `fk_customerpunchcard_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_customerpunchcard_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `PunchCardRedemption` (
  `id` CHAR(36) PRIMARY KEY,
  `customerCardId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NULL,
  `creditsUsed` INT NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_punchredemption_card` FOREIGN KEY (`customerCardId`) REFERENCES `VenueCustomerPunchCard` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_punchredemption_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;
