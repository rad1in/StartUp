const service = require('./service');

async function list(req, res, next) {
  try {
    res.json(await service.listCustomers(req.params.venueId, { search: req.query.search }));
  } catch (err) {
    next(err);
  }
}

async function sendCoupon(req, res, next) {
  try {
    const coupon = await service.sendCustomerCoupon(req.params.venueId, req.params.customerId, req.body);
    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, sendCoupon };
