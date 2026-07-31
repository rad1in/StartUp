-- Instagram-style social feed: any user can post a photo + caption to their
-- own (already-customizable, see 0017_profile_social_fields.sql) profile;
-- everyone else can browse them in an Explore-style grid and like them.
-- likeCount is denormalized onto Post so the explore feed doesn't need a
-- COUNT(*) subquery per row — kept in sync by the like/unlike transaction
-- in socialPosts/service.js, not by a DB trigger.
CREATE TABLE `Post` (
  `id` CHAR(36) PRIMARY KEY,
  `userId` CHAR(36) NOT NULL,
  `imageUrl` VARCHAR(500) NOT NULL,
  `caption` VARCHAR(2200) NULL,
  `likeCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_post_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  KEY `idx_post_created` (`createdAt`),
  KEY `idx_post_user` (`userId`)
) ENGINE=InnoDB;

-- One row per (post, user) — its existence IS the like; toggling is just
-- INSERT-or-DELETE, never a boolean flag, so a like can never "belong" to
-- more than one user by mistake.
CREATE TABLE `PostLike` (
  `postId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`postId`, `userId`),
  CONSTRAINT `fk_postlike_post` FOREIGN KEY (`postId`) REFERENCES `Post` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_postlike_user` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
