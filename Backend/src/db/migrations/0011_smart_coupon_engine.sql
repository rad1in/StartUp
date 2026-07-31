-- Per-venue config for the smart coupon engine: periodically scans for
-- customers who've gone quiet and auto-mints a personal win-back coupon.
CREATE TABLE IF NOT EXISTS `SmartCouponConfig` (
  `venueId` CHAR(36) PRIMARY KEY,
  `isActive` TINYINT(1) NOT NULL DEFAULT 0,
  `inactivityDays` SMALLINT NOT NULL DEFAULT 30,
  `discountType` ENUM('PERCENT', 'FIXED') NOT NULL DEFAULT 'PERCENT',
  `discountValue` DECIMAL(10,2) NOT NULL DEFAULT 15,
  `cooldownDays` SMALLINT NOT NULL DEFAULT 60,
  `lastRunAt` DATETIME NULL,
  CONSTRAINT `fk_smartcoupon_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- One row per auto-sent coupon, used both as an audit log and to enforce the
-- cooldown (don't re-target the same quiet customer every single run).
CREATE TABLE IF NOT EXISTS `SmartCouponLog` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `customerId` CHAR(36) NOT NULL,
  `couponCode` VARCHAR(40) NOT NULL,
  `sentAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_smartcouponlog_venue_customer` (`venueId`, `customerId`),
  CONSTRAINT `fk_smartcouponlog_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
