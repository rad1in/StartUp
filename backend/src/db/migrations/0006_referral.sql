CREATE TABLE IF NOT EXISTS `ReferralCode` (
  `userId` CHAR(36) PRIMARY KEY,
  `code` VARCHAR(12) NOT NULL UNIQUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_referralcode_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Reward is credited to both sides only once the referee places their first
-- successful order — registering alone doesn't pay out, to make farming fake
-- signups pointless.
CREATE TABLE IF NOT EXISTS `Referral` (
  `id` CHAR(36) PRIMARY KEY,
  `referrerUserId` CHAR(36) NOT NULL,
  `refereeUserId` CHAR(36) NOT NULL UNIQUE,
  `rewardAmount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('PENDING','COMPLETED') NOT NULL DEFAULT 'PENDING',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` DATETIME NULL,
  INDEX `idx_referral_referrer` (`referrerUserId`),
  CONSTRAINT `fk_referral_referrer` FOREIGN KEY (`referrerUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_referee` FOREIGN KEY (`refereeUserId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
