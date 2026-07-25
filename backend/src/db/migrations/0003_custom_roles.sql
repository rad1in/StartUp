-- Reusable named permission bundles admins can define once and apply to any
-- platform staff member, instead of hand-picking permissions every time.
CREATE TABLE IF NOT EXISTS `CustomRole` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `permissions` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
