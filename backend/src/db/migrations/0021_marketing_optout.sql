-- Marketing opt-out flags — separate from transactional messaging (OTP,
-- order status, receipt-on-request), which customers always get regardless
-- of these. Respected by smsCampaigns/emailCampaigns audience queries.
ALTER TABLE `User` ADD COLUMN `smsMarketingOptOut` BOOLEAN NOT NULL DEFAULT FALSE AFTER `phone`;
ALTER TABLE `User` ADD COLUMN `emailMarketingOptOut` BOOLEAN NOT NULL DEFAULT FALSE AFTER `email`;
