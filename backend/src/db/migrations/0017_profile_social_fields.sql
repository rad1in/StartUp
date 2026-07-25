-- Lays groundwork for future social-profile features: a public handle,
-- a short bio, a cover/banner image (separate from the avatar), and a
-- visibility flag so a profile isn't public by default until the user
-- opts in.
ALTER TABLE `User`
  ADD COLUMN `username` VARCHAR(30) NULL UNIQUE AFTER `name`,
  ADD COLUMN `bio` VARCHAR(280) NULL AFTER `username`,
  ADD COLUMN `coverImageUrl` VARCHAR(500) NULL AFTER `avatarUrl`,
  ADD COLUMN `isProfilePublic` BOOLEAN NOT NULL DEFAULT FALSE AFTER `coverImageUrl`;
