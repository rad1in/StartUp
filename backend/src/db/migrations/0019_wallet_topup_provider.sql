-- Wallet top-up now supports multiple selectable gateways (see payments/
-- index.js's per-provider enable flags) instead of one global active
-- provider, so confirmTopUp needs to know which gateway's API to call.
ALTER TABLE `WalletTransaction` ADD COLUMN `provider` VARCHAR(50) NULL AFTER `providerRef`;
