const service = require('./service');

async function listShares(req, res, next) {
  try {
    res.json(await service.listShares(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createSplit(req, res, next) {
  try {
    const { type, labels, assignments } = req.body;
    let shares;
    if (type === 'equal') {
      shares = await service.createEqualSplit(req.params.id, labels);
    } else if (type === 'itemized') {
      shares = await service.createItemizedSplit(req.params.id, assignments);
    } else {
      return res.status(400).json({ message: 'نوع تقسیم باید equal یا itemized باشد.' });
    }
    res.status(201).json(shares);
  } catch (err) {
    next(err);
  }
}

module.exports = { listShares, createSplit };
