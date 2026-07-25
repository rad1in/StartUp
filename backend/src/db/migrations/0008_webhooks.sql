-- Venue-scoped outbound webhooks for third-party integrations (POS, kitchen
-- systems, etc). Deliveries are signed with the stored secret (HMAC-SHA256,
-- like Stripe/GitHub webhooks) so receivers can verify authenticity.
CREATE TABLE IF NOT EXISTS `Webhook` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `secret` CHAR(64) NOT NULL,
  `events` JSON NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `lastTriggeredAt` DATETIME NULL,
  `lastStatus` VARCHAR(20) NULL,
  `lastError` VARCHAR(500) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_webhook_venue` (`venueId`),
  CONSTRAINT `fk_webhook_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
