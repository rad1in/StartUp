-- Venue-scoped API keys for external integrations. Only a SHA-256 hash of the
-- key is stored; the plaintext key is shown to the venue owner exactly once,
-- at creation time, the same way GitHub/Stripe tokens work.
CREATE TABLE IF NOT EXISTS `ApiKey` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `keyPrefix` VARCHAR(16) NOT NULL,
  `keyHash` CHAR(64) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastUsedAt` DATETIME NULL,
  `revokedAt` DATETIME NULL,
  INDEX `idx_apikey_venue` (`venueId`),
  INDEX `idx_apikey_hash` (`keyHash`),
  CONSTRAINT `fk_apikey_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
