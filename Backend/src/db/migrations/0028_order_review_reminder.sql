-- Tracks whether the "how was your order?" review-reminder notification has
-- already been sent for this order, so the once-a-minute poll in
-- orders/service.js#processDueReviewReminders never sends it twice.
ALTER TABLE `Order`
  ADD COLUMN `reviewReminderSentAt` DATETIME NULL AFTER `updatedAt`;
