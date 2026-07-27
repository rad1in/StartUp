-- IP-level blocking. Rows here are checked by middleware/ipBlocklist.js on
-- every request before it reaches any route — a blocked IP gets a flat 403
-- with no further processing. Populated two ways: an admin manually blocks
-- an IP they spot in the logs, or the system auto-blocks an IP that tripped
-- the auth rate limiter repeatedly (see middleware/rateLimit.js) — always
-- temporary (`expiresAt` set) when automatic, so a shared/NAT'd IP with one
-- bad actor doesn't get permanently locked out. Blocking, unlike deleting
-- data, is fully reversible — an admin can always remove or shorten a row.
CREATE TABLE `BlockedIp` (
  `id` CHAR(36) PRIMARY KEY,
  `ip` VARCHAR(45) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `source` ENUM('MANUAL','AUTO_RATE_LIMIT') NOT NULL DEFAULT 'MANUAL',
  `createdBy` CHAR(36) NULL,
  `expiresAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_blockedip_ip` (`ip`),
  CONSTRAINT `fk_blockedip_creator` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB;
