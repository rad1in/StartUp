-- Upgrades the customer support system from a single subject+message form
-- into a real ticket + chat thread: department routing, a message thread
-- per ticket, file attachments, and an optional per-message confidential
-- flag (encrypted at rest — see backend/src/lib/ticketCrypto.js).

ALTER TABLE `SupportTicket`
  ADD COLUMN `department` ENUM('MANAGEMENT', 'SALES', 'TECHNICAL') NOT NULL DEFAULT 'TECHNICAL' AFTER `orderId`,
  MODIFY COLUMN `message` TEXT NULL;

CREATE TABLE IF NOT EXISTS `SupportTicketMessage` (
  `id` CHAR(36) PRIMARY KEY,
  `ticketId` CHAR(36) NOT NULL,
  `senderId` CHAR(36) NOT NULL,
  `body` TEXT NULL,
  `isConfidential` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ticketmsg_ticket` (`ticketId`),
  CONSTRAINT `fk_ticketmsg_ticket` FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticketmsg_sender` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `SupportTicketAttachment` (
  `id` CHAR(36) PRIMARY KEY,
  `messageId` CHAR(36) NOT NULL,
  `fileUrl` VARCHAR(500) NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `mimeType` VARCHAR(100) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ticketattach_message` (`messageId`),
  CONSTRAINT `fk_ticketattach_msg` FOREIGN KEY (`messageId`) REFERENCES `SupportTicketMessage` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Backfill: turn each existing ticket's original single message into the
-- first entry of its chat thread, so old tickets keep their history.
INSERT INTO `SupportTicketMessage` (id, ticketId, senderId, body, isConfidential, createdAt)
SELECT UUID(), t.id, t.userId, t.message, FALSE, t.createdAt
FROM `SupportTicket` t
WHERE t.message IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `SupportTicketMessage` m WHERE m.ticketId = t.id);
