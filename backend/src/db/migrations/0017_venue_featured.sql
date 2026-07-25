-- Paid/contractual "featured" placement — a platform admin grants this to
-- venues with a promotion agreement; featured venues get boosted ranking in
-- discovery lists (search/nearby), not a hard override of distance sorting.
ALTER TABLE `Venue` ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT FALSE AFTER `status`;
