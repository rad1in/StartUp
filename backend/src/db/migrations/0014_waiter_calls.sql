-- Lightweight "call waiter" requests: a customer at a table asks for staff
-- help without placing an order. Kept separate from Order/TableSession since
-- it has no items/price and a much shorter lifecycle (created -> resolved).
CREATE TABLE IF NOT EXISTS `WaiterCall` (
  `id` CHAR(36) PRIMARY KEY,
  `venueId` CHAR(36) NOT NULL,
  `tableId` CHAR(36) NOT NULL,
  `tableNumber` VARCHAR(50) NULL,
  `note` VARCHAR(255) NULL,
  `status` ENUM('PENDING', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolvedAt` DATETIME NULL,
  INDEX `idx_waiter_call_venue_status` (`venueId`, `status`),
  CONSTRAINT `fk_waiter_call_venue` FOREIGN KEY (`venueId`) REFERENCES `Venue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_waiter_call_table` FOREIGN KEY (`tableId`) REFERENCES `VenueTable` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
