-- Optional "also send by email" toggle on a marketing campaign, reusing the
-- same admin-approval flow. Unlike SMS, email is free (no per-message cost
-- charged against smsCredit) so it doesn't affect pricePerMessage/totalCost.
ALTER TABLE `SmsCampaign` ADD COLUMN `alsoSendEmail` BOOLEAN NOT NULL DEFAULT FALSE AFTER `message`;
ALTER TABLE `SmsCampaign` ADD COLUMN `emailSentCount` INT NULL AFTER `sentCount`;
