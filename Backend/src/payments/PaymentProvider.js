/**
 * Abstract payment provider. Concrete gateways (Zarinpal, IDPay, etc.) should
 * extend this and be registered in payments/index.js — nothing outside this
 * folder should depend on a specific provider's API shape.
 */
class PaymentProvider {
  // eslint-disable-next-line no-unused-vars
  async createPayment(order) {
    throw new Error('createPayment must be implemented by the payment provider');
  }

  // eslint-disable-next-line no-unused-vars
  async verifyPayment(providerRef) {
    throw new Error('verifyPayment must be implemented by the payment provider');
  }
}

module.exports = PaymentProvider;
