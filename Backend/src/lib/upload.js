const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const { config } = require('../config/config');

// Every image upload in the app funnels through here: collected in memory
// (never written to disk in its original form), decoded and re-encoded by
// sharp, and only the resulting WebP is saved. This means (a) every image
// the platform serves is small and in one consistent format regardless of
// what the user's phone/camera produced, and (b) a file that isn't actually
// a real image (extension/mimetype spoofed) fails at the decode step instead
// of silently landing in the public uploads dir.
function createImageUploader(subdir) {
  const dir = path.resolve(__dirname, '../../', config.uploadDir, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const upload = multer({
    storage: multer.memoryStorage(),
    // The ceiling only needs to be generous enough for a real, unedited
    // phone-camera photo — sharp shrinks it down after upload, so there's no
    // reason to make users pre-compress anything themselves.
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  });

  // A directory can serve more than one preset (e.g. venue logos are small/
  // square while venue covers are wide — both still live under /uploads/venues).
  function makeOptimizer({ maxWidth, maxHeight, quality }) {
    // Chained after upload.single(field) — reads req.file.buffer, and
    // replaces it with the processed result so existing controllers (which
    // only read req.file.filename) don't need to know anything changed.
    return async function optimize(req, res, next) {
      if (!req.file) return next();
      try {
        const filename = `${randomUUID()}.webp`;
        const outputPath = path.join(dir, filename);
        await sharp(req.file.buffer, { animated: false })
          .rotate() // honor EXIF orientation before resizing (phone photos are often sideways otherwise)
          .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toFile(outputPath);
        req.file.filename = filename;
        req.file.path = outputPath;
        req.file.mimetype = 'image/webp';
        next();
      } catch (err) {
        const wrapped = new Error(
          'فایل ارسال‌شده یک تصویر معتبر نیست: فرمت فایل پشتیبانی نمی‌شود یا فایل خراب است. لطفاً یک عکس با فرمت JPG، PNG، WebP، HEIC یا GIF انتخاب کنید.'
        );
        wrapped.status = 400;
        next(wrapped);
      }
    };
  }

  const urlFor = (filename) => `/uploads/${subdir}/${filename}`;

  return { upload, makeOptimizer, urlFor, dir };
}

// Presets tuned per use-case — see the size/quality table agreed with product:
// small square avatars, wide banners/covers, and roughly-square menu photos.
const SQUARE_PRESET = { maxWidth: 512, maxHeight: 512, quality: 75 };
const WIDE_PRESET = { maxWidth: 1600, maxHeight: 900, quality: 78 };
const MENU_PRESET = { maxWidth: 1200, maxHeight: 1200, quality: 78 };
// Portrait-leaning cap (Instagram's own 1080x1350 ratio) — social posts are
// framed by the poster, not cropped to a fixed shape like avatars/menu items.
const POST_PRESET = { maxWidth: 1080, maxHeight: 1350, quality: 80 };

const avatars = createImageUploader('avatars');
const profileCovers = createImageUploader('profile-covers');
const venueImages = createImageUploader('venues');
const menuImages = createImageUploader('menu');
const postImages = createImageUploader('posts');

const avatarOptimize = avatars.makeOptimizer(SQUARE_PRESET);
const coverImageOptimize = profileCovers.makeOptimizer(WIDE_PRESET);
const venueLogoOptimize = venueImages.makeOptimizer(SQUARE_PRESET);
const venueCoverOptimize = venueImages.makeOptimizer(WIDE_PRESET);
const menuImageOptimize = menuImages.makeOptimizer(MENU_PRESET);
const postImageOptimize = postImages.makeOptimizer(POST_PRESET);

// Broader than the image uploaders above — support ticket attachments are
// commonly screenshots or PDF receipts. Kept as-is (original file, no resize/
// re-encode) since these are evidence attached to a support conversation,
// not decorative images — compressing them isn't worth the risk of losing
// detail a support agent might need to read.
function createFileUploader(subdir) {
  const dir = path.resolve(__dirname, '../../', config.uploadDir, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);
  const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ALLOWED_EXT.has(ext) ? ext : ''}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
        return cb(new Error('فقط فایل تصویری یا PDF (حداکثر ۵ مگابایت) مجاز است.'));
      }
      cb(null, true);
    },
  });

  const urlFor = (filename) => `/uploads/${subdir}/${filename}`;

  return { upload, urlFor, dir };
}

const ticketAttachments = createFileUploader('support-attachments');

// In-memory (not disk) uploader for small CSV bulk-import files — the buffer
// is parsed and discarded, never written to the public uploads dir.
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('فقط فایل CSV مجاز است.'));
    }
    cb(null, true);
  },
});

module.exports = {
  avatarUpload: avatars.upload,
  avatarOptimize,
  avatarUrlFor: avatars.urlFor,
  coverImageUpload: profileCovers.upload,
  coverImageOptimize,
  coverImageUrlFor: profileCovers.urlFor,
  venueImageUpload: venueImages.upload,
  venueLogoOptimize,
  venueCoverOptimize,
  venueImageUrlFor: venueImages.urlFor,
  menuImageUpload: menuImages.upload,
  menuImageOptimize,
  menuImageUrlFor: menuImages.urlFor,
  postImageUpload: postImages.upload,
  postImageOptimize,
  postImageUrlFor: postImages.urlFor,
  ticketAttachmentUpload: ticketAttachments.upload,
  ticketAttachmentUrlFor: ticketAttachments.urlFor,
  csvUpload,
};
