const service = require('./service');
const { logActivity } = require('../../lib/activityLog');

async function listFaqPublic(req, res, next) {
  try {
    res.json(await service.listFaq());
  } catch (err) {
    next(err);
  }
}

async function listBannersPublic(req, res, next) {
  try {
    res.json(await service.listBanners({ audience: req.query.audience, activeOnly: true }));
  } catch (err) {
    next(err);
  }
}

async function getDiscoverySettingsPublic(req, res, next) {
  try {
    res.json(await service.getDiscoverySettings());
  } catch (err) {
    next(err);
  }
}

async function getFeatureFlagsPublic(req, res, next) {
  try {
    res.json(await service.getFeatureFlags());
  } catch (err) {
    next(err);
  }
}

async function getFeatureFlagsAdmin(req, res, next) {
  try {
    res.json({ flags: await service.getFeatureFlags(), definitions: service.FEATURE_FLAG_DEFS });
  } catch (err) {
    next(err);
  }
}

async function updateFeatureFlags(req, res, next) {
  try {
    const flags = await service.updateFeatureFlags(req.body);
    await logActivity(null, req.user.id, 'FEATURE_FLAGS_UPDATED', 'PlatformSetting', null, req.body);
    res.json(flags);
  } catch (err) {
    next(err);
  }
}

async function listFaqAdmin(req, res, next) {
  try {
    res.json(await service.listFaq());
  } catch (err) {
    next(err);
  }
}

async function createFaq(req, res, next) {
  try {
    const faq = await service.createFaq(req.body);
    await logActivity(null, req.user.id, 'FAQ_CREATED', 'FaqItem', faq.id, req.body);
    res.status(201).json(faq);
  } catch (err) {
    next(err);
  }
}

async function updateFaq(req, res, next) {
  try {
    const faq = await service.updateFaq(req.params.id, req.body);
    await logActivity(null, req.user.id, 'FAQ_UPDATED', 'FaqItem', req.params.id, req.body);
    res.json(faq);
  } catch (err) {
    next(err);
  }
}

async function deleteFaq(req, res, next) {
  try {
    await service.deleteFaq(req.params.id);
    await logActivity(null, req.user.id, 'FAQ_DELETED', 'FaqItem', req.params.id, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listBannersAdmin(req, res, next) {
  try {
    res.json(await service.listBanners({ audience: req.query.audience }));
  } catch (err) {
    next(err);
  }
}

async function createBanner(req, res, next) {
  try {
    const banner = await service.createBanner(req.body);
    await logActivity(null, req.user.id, 'BANNER_CREATED', 'Banner', banner.id, req.body);
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
}

async function updateBanner(req, res, next) {
  try {
    const banner = await service.updateBanner(req.params.id, req.body);
    await logActivity(null, req.user.id, 'BANNER_UPDATED', 'Banner', req.params.id, req.body);
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

async function deleteBanner(req, res, next) {
  try {
    await service.deleteBanner(req.params.id);
    await logActivity(null, req.user.id, 'BANNER_DELETED', 'Banner', req.params.id, null);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getDiscoverySettingsAdmin(req, res, next) {
  try {
    res.json(await service.getDiscoverySettings());
  } catch (err) {
    next(err);
  }
}

async function updateDiscoverySettings(req, res, next) {
  try {
    const settings = await service.updateDiscoverySettings(req.body);
    await logActivity(null, req.user.id, 'PLATFORM_SETTINGS_UPDATED', 'PlatformSetting', null, req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFaqPublic,
  listBannersPublic,
  getDiscoverySettingsPublic,
  listFaqAdmin,
  createFaq,
  updateFaq,
  deleteFaq,
  listBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  getDiscoverySettingsAdmin,
  updateDiscoverySettings,
  getFeatureFlagsPublic,
  getFeatureFlagsAdmin,
  updateFeatureFlags,
};
