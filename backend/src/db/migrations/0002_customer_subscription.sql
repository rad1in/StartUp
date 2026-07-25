-- Paid customer "perks" subscription: for 30 days after purchase, every order
-- rolls a weighted-random discount (see subscription/discountRoll.js for the
-- probability table). highDiscountCount tracks how many >=50% rolls have
-- landed this active period, capping them at 2-3 per subscription.
CREATE TABLE IF NOT EXISTS `CustomerSubscription` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `startsAt` DATETIME NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `status` ENUM('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `pricePaid` DECIMAL(12,2) NOT NULL,
  `highDiscountCount` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_customersubscription_user` (`userId`),
  INDEX `idx_customersubscription_status` (`status`),
  CONSTRAINT `fk_customersubscription_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `SubscriptionDiscountLog` (
  `id` CHAR(36) PRIMARY KEY,
  `subscriptionId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `discountPercent` DECIMAL(5,2) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_subdiscountlog_sub` (`subscriptionId`),
  CONSTRAINT `fk_subdiscountlog_sub` FOREIGN KEY (`subscriptionId`) REFERENCES `CustomerSubscription` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subdiscountlog_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
