-- AI-generated translations of venue-owner-entered Persian content, silently
-- populated in the background by lib/autoTranslate.js (GapGPT) whenever a
-- venue/category/menu item is created or its name/description/tags change.
-- Shape: { "en": {"name": "...", "description": "..."}, "ar": {...}, "tr": {...} }
-- NULL until the first successful translation; customer-facing reads fall
-- back to the original Persian column whenever a language/field is missing.
ALTER TABLE `Venue` ADD COLUMN `translations` JSON NULL AFTER `postalCode`;
ALTER TABLE `Category` ADD COLUMN `translations` JSON NULL AFTER `isHidden`;
ALTER TABLE `MenuItem` ADD COLUMN `translations` JSON NULL AFTER `scheduleDays`;
