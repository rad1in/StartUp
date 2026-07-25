-- Baseline migration: every table as of the pre-migrations schema, captured
-- with CREATE TABLE IF NOT EXISTS so it's a safe no-op on databases that
-- already have these tables (every existing dev/prod DB) and a full bootstrap
-- on a brand new one. Never edit this file after it has shipped — add a new
-- numbered migration instead.
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `User` (
  `id` CHAR(36) PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `phone` VARCHAR(32) NULL,
  `passwordHash` VARCHAR(255) NULL,
  `name` VARCHAR(255) NOT NULL,
  `twoFactorSecret` VARCHAR(255) NULL,
  `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `role` ENUM('CUSTOMER','VENUE_STAFF','VENUE_OWNER','SUPER_ADMIN','SUPPORT_STAFF','FINANCE_STAFF') NOT NULL DEFAULT 'CUSTOMER',
  `venueId` CHAR(36) NULL,
  `loyaltyPoints` INT NOT NULL DEFAULT 0,
  `avatarUrl` VARCHAR(500) NULL,
  `phoneVerifiedAt` DATETIME NULL,
  `deletedAt` DATETIME NULL,
  `isSuspended` BOOLEAN NOT NULL DEFAULT FALSE,
  `suspendedAt` DATETIME NULL,
  `suspendReason` VARCHAR(255) NULL,
  `failedLoginAttempts` INT NOT NULL DEFAULT 0,
  `lockedUntil` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_venueId` (`venueId`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `VenueBrand` (
  `id` CHAR(36) PRIMARY KEY,
  `ownerId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `logoUrl` VARCHAR(500) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_venuebrand_ownerId` (`ownerId`),
  CONSTRAINT `fk_venuebrand_owner` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Venue` (
  `id` CHAR(36) PRIMARY KEY,
  `ownerId` CHAR(36) NOT NULL,
  `brandId` CHAR(36) NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `address` VARCHAR(500) NULL,
  `lat` DOUBLE NOT NULL,
  `lng` DOUBLE NOT NULL,
  `logoUrl` VARCHAR(500) NULL,
  `coverImageUrl` VARCHAR(500) NULL,
  `cuisineType` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `neighborhood` VARCHAR(100) NULL,
  `tags` JSON NULL,
  `openingHours` JSON NULL,
  `status` ENUM('PENDING','ACTIVE','SUSPENDED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  `statusReason` VARCHAR(255) NULL,
  `subscriptionTier` ENUM('FREE','PRO','ULTRA') NOT NULL DEFAULT 'FREE',
  `commissionRate` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `loyaltyPointsRate` DECIMAL(6,2) NULL,
  `inventoryEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `isTemporarilyClosed` BOOLEAN NOT NULL DEFAULT FALSE,
  `temporarilyClosedReason` VARCHAR(255) NULL,
  `acceptsPickup` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_venue_ownerId` (`ownerId`),
  INDEX `idx_venue_brandId` (`brandId`),
  CONSTRAINT `fk_venue_owner` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`),
  CONSTRAINT `fk_venue_brand` FOREIGN KEY (`brandId`) REFERENCES `VenueBrand` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE `User`
  ADD CONSTRAINT `fk_user_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `RefreshToken` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `tokenHash` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `revoked` BOOLEAN NOT NULL DEFAULT FALSE,
  `userAgent` VARCHAR(255) NULL,
  `ip` VARCHAR(64) NULL,
  `lastUsedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_refreshtoken_userId` (`userId`),
  CONSTRAINT `fk_refreshtoken_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `VenueTable` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `tableNumber` VARCHAR(50) NOT NULL,
  `qrToken` VARCHAR(255) NOT NULL UNIQUE,
  INDEX `idx_venuetable_venueId` (`venueId`),
  CONSTRAINT `fk_venuetable_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Category` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isHidden` BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX `idx_category_venueId` (`venueId`),
  CONSTRAINT `fk_category_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `MenuItem` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `categoryId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `imageUrl` VARCHAR(500) NULL,
  `tags` VARCHAR(500) NULL,
  `isAvailable` BOOLEAN NOT NULL DEFAULT TRUE,
  `scheduleStart` TIME NULL,
  `scheduleEnd` TIME NULL,
  `scheduleDays` VARCHAR(20) NULL,
  INDEX `idx_menuitem_venueId` (`venueId`),
  INDEX `idx_menuitem_categoryId` (`categoryId`),
  CONSTRAINT `fk_menuitem_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_menuitem_category` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`)
) ENGINE=InnoDB;

-- Reusable modifier groups at venue level (replaces old per-item VariantGroup/VariantOption).
-- type: SINGLE_SELECT = radio (pick exactly 1), MULTI_SELECT = checkboxes (pick min..max),
--       TOGGLE_REMOVE = included-by-default options the customer can remove (e.g. "no onion").
CREATE TABLE IF NOT EXISTS `ModifierGroup` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('SINGLE_SELECT','MULTI_SELECT','TOGGLE_REMOVE') NOT NULL DEFAULT 'SINGLE_SELECT',
  `isRequired` BOOLEAN NOT NULL DEFAULT FALSE,
  `minSelections` INT NOT NULL DEFAULT 0,
  `maxSelections` INT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  INDEX `idx_modifiergroup_venueId` (`venueId`),
  CONSTRAINT `fk_modifiergroup_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ModifierOption` (
  `id` CHAR(36) PRIMARY KEY,
  `groupId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `priceAdjustment` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `isDefault` BOOLEAN NOT NULL DEFAULT FALSE,
  `sortOrder` INT NOT NULL DEFAULT 0,
  INDEX `idx_modifieroption_groupId` (`groupId`),
  CONSTRAINT `fk_modifieroption_group` FOREIGN KEY (`groupId`) REFERENCES `ModifierGroup` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Junction: which modifier groups apply to which menu items.
CREATE TABLE IF NOT EXISTS `MenuItemModifier` (
  `menuItemId` CHAR(36) NOT NULL,
  `groupId` CHAR(36) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`menuItemId`, `groupId`),
  CONSTRAINT `fk_menuitemmodifier_item` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_menuitemmodifier_group` FOREIGN KEY (`groupId`) REFERENCES `ModifierGroup` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Venue-defined complementary item pairing rules.
-- When triggerMenuItemId is in the cart, suggestedMenuItemId is offered as an add-on.
CREATE TABLE IF NOT EXISTS `ItemPairingRule` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `triggerMenuItemId` CHAR(36) NOT NULL,
  `suggestedMenuItemId` CHAR(36) NOT NULL,
  `priority` INT NOT NULL DEFAULT 0,
  UNIQUE KEY `uq_itempairingrule` (`triggerMenuItemId`, `suggestedMenuItemId`),
  INDEX `idx_itempairingrule_venueId` (`venueId`),
  INDEX `idx_itempairingrule_trigger` (`triggerMenuItemId`),
  CONSTRAINT `fk_itempairingrule_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_itempairingrule_trigger` FOREIGN KEY (`triggerMenuItemId`) REFERENCES `MenuItem` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_itempairingrule_suggested` FOREIGN KEY (`suggestedMenuItemId`) REFERENCES `MenuItem` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Coupon` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `discountType` ENUM('PERCENT','FIXED') NOT NULL,
  `discountValue` DECIMAL(10,2) NOT NULL,
  `expiresAt` DATETIME NULL,
  `maxRedemptions` INT NULL,
  `redeemedCount` INT NOT NULL DEFAULT 0,
  `minOrderAmount` DECIMAL(10,2) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_coupon_venueId` (`venueId`),
  CONSTRAINT `fk_coupon_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Combo` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `imageUrl` VARCHAR(500) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_combo_venueId` (`venueId`),
  CONSTRAINT `fk_combo_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ComboItem` (
  `id` CHAR(36) PRIMARY KEY,
  `comboId` CHAR(36) NOT NULL,
  `menuItemId` CHAR(36) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  INDEX `idx_comboitem_comboId` (`comboId`),
  CONSTRAINT `fk_comboitem_combo` FOREIGN KEY (`comboId`) REFERENCES `Combo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comboitem_menuitem` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Order` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `tableId` CHAR(36) NULL,
  `customerId` CHAR(36) NULL,
  `isPickup` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM('PENDING','PREPARING','READY','SERVED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paymentStatus` ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `totalAmount` DECIMAL(10,2) NOT NULL,
  `walletAmountUsed` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `discountAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `discountReason` VARCHAR(255) NULL,
  `voidReason` VARCHAR(255) NULL,
  `commissionAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `couponId` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_venueId` (`venueId`),
  INDEX `idx_order_tableId` (`tableId`),
  INDEX `idx_order_customerId` (`customerId`),
  INDEX `idx_order_couponId` (`couponId`),
  CONSTRAINT `fk_order_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`),
  CONSTRAINT `fk_order_table` FOREIGN KEY (`tableId`) REFERENCES `VenueTable` (`id`),
  CONSTRAINT `fk_order_customer` FOREIGN KEY (`customerId`) REFERENCES `User` (`id`),
  CONSTRAINT `fk_order_coupon` FOREIGN KEY (`couponId`) REFERENCES `Coupon` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `OrderItem` (
  `id` CHAR(36) PRIMARY KEY,
  `orderId` CHAR(36) NOT NULL,
  `menuItemId` CHAR(36) NULL,
  `comboId` CHAR(36) NULL,
  `quantity` INT NOT NULL,
  `unitPrice` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `variantSelections` JSON NULL,
  `addedByLabel` VARCHAR(100) NULL,
  INDEX `idx_orderitem_orderId` (`orderId`),
  INDEX `idx_orderitem_menuItemId` (`menuItemId`),
  INDEX `idx_orderitem_comboId` (`comboId`),
  CONSTRAINT `fk_orderitem_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orderitem_menuitem` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`),
  CONSTRAINT `fk_orderitem_combo` FOREIGN KEY (`comboId`) REFERENCES `Combo` (`id`),
  CONSTRAINT `chk_orderitem_ref` CHECK (
    (`menuItemId` IS NOT NULL AND `comboId` IS NULL) OR (`menuItemId` IS NULL AND `comboId` IS NOT NULL)
  )
) ENGINE=InnoDB;

-- Shared-table / group-ordering sessions: multiple guests scanning the same
-- table QR build one live cart together before a single checkout.
CREATE TABLE IF NOT EXISTS `TableSession` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `tableId` CHAR(36) NOT NULL,
  `status` ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  `orderId` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closedAt` DATETIME NULL,
  INDEX `idx_tablesession_venueId` (`venueId`),
  INDEX `idx_tablesession_tableId` (`tableId`),
  CONSTRAINT `fk_tablesession_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tablesession_table` FOREIGN KEY (`tableId`) REFERENCES `VenueTable` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tablesession_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `TableSessionParticipant` (
  `id` CHAR(36) PRIMARY KEY,
  `sessionId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NULL,
  `guestName` VARCHAR(100) NULL,
  `joinedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tablesessionparticipant_sessionId` (`sessionId`),
  CONSTRAINT `fk_tsparticipant_session` FOREIGN KEY (`sessionId`) REFERENCES `TableSession` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tsparticipant_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`),
  CONSTRAINT `chk_tsparticipant_ref` CHECK (
    (`userId` IS NOT NULL AND `guestName` IS NULL) OR (`userId` IS NULL AND `guestName` IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `TableSessionItem` (
  `id` CHAR(36) PRIMARY KEY,
  `sessionId` CHAR(36) NOT NULL,
  `participantId` CHAR(36) NOT NULL,
  `menuItemId` CHAR(36) NULL,
  `comboId` CHAR(36) NULL,
  `quantity` INT NOT NULL,
  `variantSelections` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tablesessionitem_sessionId` (`sessionId`),
  CONSTRAINT `fk_tsitem_session` FOREIGN KEY (`sessionId`) REFERENCES `TableSession` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tsitem_participant` FOREIGN KEY (`participantId`) REFERENCES `TableSessionParticipant` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tsitem_menuitem` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`),
  CONSTRAINT `fk_tsitem_combo` FOREIGN KEY (`comboId`) REFERENCES `Combo` (`id`),
  CONSTRAINT `chk_tsitem_ref` CHECK (
    (`menuItemId` IS NOT NULL AND `comboId` IS NULL) OR (`menuItemId` IS NULL AND `comboId` IS NOT NULL)
  )
) ENGINE=InnoDB;

-- Server-persisted cart per logged-in customer per venue (one row per pair).
CREATE TABLE IF NOT EXISTS `SavedCart` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `items` JSON NOT NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_savedcart` (`userId`, `venueId`),
  CONSTRAINT `fk_savedcart_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_savedcart_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Per-person bill shares for split-bill checkout.
-- Each share is paid independently; order paymentStatus flips to SUCCESS only when all shares are paid.
CREATE TABLE IF NOT EXISTS `BillShare` (
  `id` CHAR(36) PRIMARY KEY,
  `orderId` CHAR(36) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `paymentStatus` ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
  `participantId` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_billshare_orderId` (`orderId`),
  CONSTRAINT `fk_billshare_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_billshare_participant` FOREIGN KEY (`participantId`) REFERENCES `TableSessionParticipant` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Payment` (
  `id` CHAR(36) PRIMARY KEY,
  `orderId` CHAR(36) NOT NULL,
  `provider` VARCHAR(100) NOT NULL,
  `providerRef` VARCHAR(255) NULL,
  `status` ENUM('PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `amount` DECIMAL(10,2) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payment_orderId` (`orderId`),
  CONSTRAINT `fk_payment_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `CouponRedemption` (
  `id` CHAR(36) PRIMARY KEY,
  `couponId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NULL,
  `orderId` CHAR(36) NOT NULL,
  `redeemedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_couponredemption_couponId` (`couponId`),
  INDEX `idx_couponredemption_userId` (`userId`),
  CONSTRAINT `fk_couponredemption_coupon` FOREIGN KEY (`couponId`) REFERENCES `Coupon` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_couponredemption_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`),
  CONSTRAINT `fk_couponredemption_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Expense` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `note` VARCHAR(500) NULL,
  `date` DATETIME NOT NULL,
  INDEX `idx_expense_venueId` (`venueId`),
  CONSTRAINT `fk_expense_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `LoyaltyTransaction` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NULL,
  `orderId` CHAR(36) NULL,
  `type` ENUM('EARN','REDEEM','ADJUST') NOT NULL,
  `points` INT NOT NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_loyaltytx_userId` (`userId`),
  CONSTRAINT `fk_loyaltytx_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loyaltytx_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`),
  CONSTRAINT `fk_loyaltytx_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Address` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `addressLine` VARCHAR(500) NOT NULL,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_address_userId` (`userId`),
  CONSTRAINT `fk_address_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `OtpCode` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NULL,
  `phone` VARCHAR(32) NOT NULL,
  `codeHash` VARCHAR(255) NOT NULL,
  `purpose` VARCHAR(50) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `consumedAt` DATETIME NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otpcode_phone` (`phone`),
  CONSTRAINT `fk_otpcode_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `FavoriteVenue` (
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `venueId`),
  CONSTRAINT `fk_favvenue_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favvenue_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `FavoriteMenuItem` (
  `userId` CHAR(36) NOT NULL,
  `menuItemId` CHAR(36) NOT NULL,
  `savedCustomization` JSON NULL,
  `nickname` VARCHAR(100) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `menuItemId`),
  CONSTRAINT `fk_favitem_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favitem_menuitem` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `RecentlyViewedVenue` (
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `viewedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `venueId`),
  CONSTRAINT `fk_recentvenue_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recentvenue_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Review` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NOT NULL,
  `menuItemId` CHAR(36) NULL,
  `rating` TINYINT NOT NULL,
  `comment` TEXT NULL,
  `venueReply` TEXT NULL,
  `venueRepliedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_review_userId` (`userId`),
  INDEX `idx_review_venueId` (`venueId`),
  INDEX `idx_review_orderId` (`orderId`),
  CONSTRAINT `fk_review_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_menuitem` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`),
  CONSTRAINT `chk_review_rating` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Notification` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `type` ENUM('ORDER_STATUS','PROMO','LOYALTY','SYSTEM','NEW_ORDER','LOW_REVIEW') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` VARCHAR(1000) NULL,
  `data` JSON NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notification_userId` (`userId`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `NotificationPreference` (
  `userId` CHAR(36) NOT NULL,
  `category` ENUM('ORDER_STATUS','PROMO','LOYALTY','SYSTEM','NEW_ORDER','LOW_REVIEW') NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`userId`, `category`),
  CONSTRAINT `fk_notifpref_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `SupportTicket` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `orderId` CHAR(36) NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_supportticket_userId` (`userId`),
  CONSTRAINT `fk_supportticket_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_supportticket_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ActivityLog` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NULL,
  `userId` CHAR(36) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entityType` VARCHAR(50) NOT NULL,
  `entityId` CHAR(36) NULL,
  `details` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activitylog_venueId` (`venueId`),
  INDEX `idx_activitylog_entity` (`entityType`, `entityId`),
  CONSTRAINT `fk_activitylog_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_activitylog_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `StaffPermission` (
  `userId` CHAR(36) NOT NULL,
  `permission` VARCHAR(50) NOT NULL,
  `granted` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`userId`, `permission`),
  CONSTRAINT `fk_staffpermission_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Payout` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `periodStart` DATETIME NOT NULL,
  `periodEnd` DATETIME NOT NULL,
  `status` ENUM('PENDING','PAID') NOT NULL DEFAULT 'PENDING',
  `paidAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payout_venueId` (`venueId`),
  CONSTRAINT `fk_payout_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `SubscriptionChangeRequest` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `requestedTier` ENUM('FREE','PRO','ULTRA') NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolvedAt` DATETIME NULL,
  INDEX `idx_subchangereq_venueId` (`venueId`),
  CONSTRAINT `fk_subchangereq_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `AdminPermission` (
  `userId` CHAR(36) NOT NULL,
  `permission` VARCHAR(50) NOT NULL,
  `granted` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`userId`, `permission`),
  CONSTRAINT `fk_adminpermission_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `PlatformSetting` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` JSON NOT NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Banner` (
  `id` CHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `body` VARCHAR(1000) NULL,
  `audience` ENUM('CUSTOMER','VENUE') NOT NULL DEFAULT 'CUSTOMER',
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `startsAt` DATETIME NULL,
  `endsAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `FaqItem` (
  `id` CHAR(36) PRIMARY KEY,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ApiErrorLog` (
  `id` CHAR(36) PRIMARY KEY,
  `method` VARCHAR(10) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `statusCode` INT NOT NULL,
  `message` VARCHAR(500) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_apierrorlog_createdAt` (`createdAt`)
) ENGINE=InnoDB;

-- In-app wallet: one row per customer, balance kept in sync via WalletTransaction ledger.
CREATE TABLE IF NOT EXISTS `Wallet` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL UNIQUE,
  `balance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Immutable ledger of every wallet movement: top-ups, spends, refunds, admin adjustments.
-- providerRef is set for TOPUP rows so the gateway callback can locate the pending transaction.
CREATE TABLE IF NOT EXISTS `WalletTransaction` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `type` ENUM('TOPUP','SPEND','REFUND','ADJUSTMENT') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balanceAfter` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'SUCCESS',
  `providerRef` VARCHAR(255) NULL,
  `orderId` CHAR(36) NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wallettx_userId` (`userId`),
  INDEX `idx_wallettx_orderId` (`orderId`),
  INDEX `idx_wallettx_providerRef` (`providerRef`),
  CONSTRAINT `fk_wallettx_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wallettx_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Configurable loyalty tiers (Bronze / Silver / Gold or whatever the operator names them).
-- sortOrder ascending = least privileged first; customer is assigned the highest tier they qualify for.
CREATE TABLE IF NOT EXISTS `TierConfig` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT '🥉',
  `minSpend` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `minOrders` INT NOT NULL DEFAULT 0,
  `pointsMultiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  `perks` JSON NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Badge definitions stored in DB so thresholds can be adjusted without code changes.
CREATE TABLE IF NOT EXISTS `BadgeConfig` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT '🏅',
  `description` VARCHAR(500) NOT NULL,
  `criteriaType` ENUM('TOTAL_ORDERS','ORDERS_AT_VENUE','DISTINCT_VENUES','FIRST_ORDER_OF_MONTH','TOTAL_SPEND') NOT NULL,
  `threshold` DECIMAL(12,2) NOT NULL DEFAULT 1,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- The tier a customer currently holds (upserted after every evaluation).
CREATE TABLE IF NOT EXISTS `CustomerTier` (
  `userId` CHAR(36) PRIMARY KEY,
  `tierConfigId` CHAR(36) NOT NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_customertier_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_customertier_tier` FOREIGN KEY (`tierConfigId`) REFERENCES `TierConfig` (`id`)
) ENGINE=InnoDB;

-- Badges a customer has permanently earned.
CREATE TABLE IF NOT EXISTS `CustomerBadge` (
  `userId` CHAR(36) NOT NULL,
  `badgeConfigId` CHAR(36) NOT NULL,
  `earnedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `badgeConfigId`),
  CONSTRAINT `fk_customerbadge_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_customerbadge_badge` FOREIGN KEY (`badgeConfigId`) REFERENCES `BadgeConfig` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Multi-branch: staff assigned to multiple venues beyond their primary venueId.
CREATE TABLE IF NOT EXISTS `StaffVenueAccess` (
  `userId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `venueId`),
  CONSTRAINT `fk_sva_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sva_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Inventory: raw ingredients/materials tracked per venue.
CREATE TABLE IF NOT EXISTS `RawMaterial` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `currentStock` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `reorderThreshold` DECIMAL(12,3) NOT NULL DEFAULT 0,
  `costPerUnit` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `supplierId` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_rawmaterial_venueId` (`venueId`),
  CONSTRAINT `fk_rawmaterial_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recipe: how much of each raw material is consumed per 1 unit of a menu item or modifier option.
CREATE TABLE IF NOT EXISTS `RecipeItem` (
  `id` CHAR(36) PRIMARY KEY,
  `menuItemId` CHAR(36) NULL,
  `modifierOptionId` CHAR(36) NULL,
  `rawMaterialId` CHAR(36) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  INDEX `idx_recipeitem_menuItemId` (`menuItemId`),
  INDEX `idx_recipeitem_modifierOptionId` (`modifierOptionId`),
  CONSTRAINT `fk_recipeitem_menuitem` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recipeitem_modifier` FOREIGN KEY (`modifierOptionId`) REFERENCES `ModifierOption` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recipeitem_material` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Ledger of every stock change (restock, manual deduction, order consumption, wastage).
CREATE TABLE IF NOT EXISTS `StockAdjustment` (
  `id` CHAR(36) PRIMARY KEY,
  `rawMaterialId` CHAR(36) NOT NULL,
  `venueId` CHAR(36) NOT NULL,
  `delta` DECIMAL(12,3) NOT NULL,
  `reason` ENUM('RESTOCK','MANUAL_DEDUCTION','WASTAGE','ORDER_CONSUMED','AUDIT') NOT NULL,
  `notes` VARCHAR(500) NULL,
  `costPerUnit` DECIMAL(10,2) NULL,
  `orderId` CHAR(36) NULL,
  `performedBy` CHAR(36) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_stockadj_rawMaterialId` (`rawMaterialId`),
  INDEX `idx_stockadj_venueId` (`venueId`),
  CONSTRAINT `fk_stockadj_material` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stockadj_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stockadj_order` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stockadj_user` FOREIGN KEY (`performedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Lightweight supplier directory per venue.
CREATE TABLE IF NOT EXISTS `Supplier` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `contactName` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `email` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_supplier_venueId` (`venueId`),
  CONSTRAINT `fk_supplier_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lightweight purchase orders (optional, not a full procurement system).
CREATE TABLE IF NOT EXISTS `PurchaseOrder` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `supplierId` CHAR(36) NULL,
  `status` ENUM('DRAFT','ORDERED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `totalCost` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `orderedAt` DATETIME NULL,
  `receivedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_po_venueId` (`venueId`),
  CONSTRAINT `fk_po_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplierId`) REFERENCES `Supplier` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `PurchaseOrderItem` (
  `id` CHAR(36) PRIMARY KEY,
  `purchaseOrderId` CHAR(36) NOT NULL,
  `rawMaterialId` CHAR(36) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL,
  `costPerUnit` DECIMAL(10,2) NOT NULL DEFAULT 0,
  INDEX `idx_poitem_purchaseOrderId` (`purchaseOrderId`),
  CONSTRAINT `fk_poitem_po` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_poitem_material` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Iran geography lookup (imported from src/db/data/cities.sql via importCities.js):
-- 'province' rows are top-level, 'county'/'city' rows carry provinceId.
CREATE TABLE IF NOT EXISTS `City` (
  `id` INT NOT NULL,
  `type` ENUM('province','county','city') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `lat` DECIMAL(11, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `provinceId` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`, `type`),
  INDEX `idx_city_type` (`type`),
  INDEX `idx_city_province` (`provinceId`),
  INDEX `idx_city_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `PlanConfig` (
  `id` CHAR(36) PRIMARY KEY,
  `tier` ENUM('FREE','PRO','ULTRA') NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `commissionRate` DECIMAL(5,4) NOT NULL,
  `monthlyPrice` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `yearlyPrice` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `yearlyDiscountPct` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `trialDays` INT NOT NULL DEFAULT 0,
  `features` JSON NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `VenueTrial` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL UNIQUE,
  `ownerId` CHAR(36) NOT NULL,
  `tier` ENUM('PRO','ULTRA') NOT NULL,
  `startedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `endsAt` DATETIME NOT NULL,
  `status` ENUM('ACTIVE','EXPIRED','CONVERTED','ABORTED') NOT NULL DEFAULT 'ACTIVE',
  `convertedAt` DATETIME NULL,
  INDEX `idx_venuetrial_ownerId` (`ownerId`),
  CONSTRAINT `fk_venuetrial_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_venuetrial_owner` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `TrialFingerprint` (
  `id` CHAR(36) PRIMARY KEY,
  `ownerId` CHAR(36) NOT NULL,
  `venueTrialId` CHAR(36) NOT NULL,
  `phone` VARCHAR(32) NULL,
  `businessId` VARCHAR(100) NULL,
  `bankAccount` VARCHAR(100) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_trialfingerprint_phone` (`phone`),
  INDEX `idx_trialfingerprint_businessId` (`businessId`),
  INDEX `idx_trialfingerprint_ownerId` (`ownerId`),
  CONSTRAINT `fk_trialfingerprint_owner` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trialfingerprint_trial` FOREIGN KEY (`venueTrialId`) REFERENCES `VenueTrial` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `PlatformCost` (
  `id` CHAR(36) PRIMARY KEY,
  `category` ENUM('SERVER','PAYMENT_GATEWAY','SMS','STAFF','MARKETING','OTHER') NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `periodYear` SMALLINT NOT NULL,
  `periodMonth` TINYINT NOT NULL,
  `createdBy` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_platformcost_period` (`periodYear`, `periodMonth`),
  CONSTRAINT `fk_platformcost_creator` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `FraudFlag` (
  `id` CHAR(36) PRIMARY KEY,
  `entityType` ENUM('VENUE','CUSTOMER','ORDER') NOT NULL,
  `entityId` CHAR(36) NOT NULL,
  `ruleKey` VARCHAR(100) NOT NULL,
  `reason` TEXT NOT NULL,
  `riskScore` TINYINT NOT NULL DEFAULT 50,
  `status` ENUM('OPEN','REVIEWING','DISMISSED','ACTIONED') NOT NULL DEFAULT 'OPEN',
  `reviewedBy` CHAR(36) NULL,
  `reviewNote` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_fraudflag_entity` (`entityType`, `entityId`),
  INDEX `idx_fraudflag_status` (`status`),
  CONSTRAINT `fk_fraudflag_reviewer` FOREIGN KEY (`reviewedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `InternalTicket` (
  `id` CHAR(36) PRIMARY KEY,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  `assignedTo` CHAR(36) NULL,
  `linkedEntityType` ENUM('VENUE','CUSTOMER','ORDER') NULL,
  `linkedEntityId` CHAR(36) NULL,
  `sourceTicketId` CHAR(36) NULL,
  `slaHours` INT NOT NULL DEFAULT 24,
  `createdBy` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_internalticket_status` (`status`),
  INDEX `idx_internalticket_assignedTo` (`assignedTo`),
  INDEX `idx_internalticket_linkedEntity` (`linkedEntityType`, `linkedEntityId`),
  CONSTRAINT `fk_internalticket_assignee` FOREIGN KEY (`assignedTo`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_internalticket_creator` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `TicketComment` (
  `id` CHAR(36) PRIMARY KEY,
  `ticketId` CHAR(36) NOT NULL,
  `authorId` CHAR(36) NOT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ticketcomment_ticketId` (`ticketId`),
  CONSTRAINT `fk_ticketcomment_ticket` FOREIGN KEY (`ticketId`) REFERENCES `InternalTicket` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticketcomment_author` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`)
) ENGINE=InnoDB;

-- Happy-hour: automatic percentage discount during a recurring time window,
-- no coupon code needed. `daysOfWeek` is a comma list of JS Date#getDay()
-- values (0=Sunday..6=Saturday); NULL means every day.
CREATE TABLE IF NOT EXISTS `HappyHourRule` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `daysOfWeek` VARCHAR(20) NULL,
  `startTime` TIME NOT NULL,
  `endTime` TIME NOT NULL,
  `discountPercent` DECIMAL(5,2) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_hh_venue` (`venueId`),
  CONSTRAINT `fk_hh_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table reservations — a booking request for a future date/time, independent
-- of the ordering flow (a reservation doesn't create an Order).
CREATE TABLE IF NOT EXISTS `Reservation` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `tableId` CHAR(36) NULL,
  `customerId` CHAR(36) NULL,
  `guestName` VARCHAR(255) NOT NULL,
  `guestPhone` VARCHAR(32) NOT NULL,
  `partySize` INT NOT NULL DEFAULT 2,
  `reservationTime` DATETIME NOT NULL,
  `status` ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW') NOT NULL DEFAULT 'PENDING',
  `notes` VARCHAR(500) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_res_venue` (`venueId`),
  INDEX `idx_res_time` (`reservationTime`),
  CONSTRAINT `fk_res_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_table` FOREIGN KEY (`tableId`) REFERENCES `VenueTable` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_res_customer` FOREIGN KEY (`customerId`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Web Push subscriptions — one row per browser/device a user has granted
-- notification permission on. `endpoint` is unique per browser install.
CREATE TABLE IF NOT EXISTS `PushSubscription` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `userAgent` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_endpoint` (`endpoint`),
  INDEX `idx_push_user` (`userId`),
  CONSTRAINT `fk_push_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
