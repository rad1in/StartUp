const { randomUUID } = require('crypto');
const PaymentProvider = require('./PaymentProvider');

/**
 * Simulates a payment gateway. Outcome is deterministic and configurable via
 * MOCK_PAYMENT_OUTCOME (success | fail | pending) so the checkout flow and
 * cashier panel can be exercised end-to-end before a real gateway is chosen.
 */
class MockPaymentProvider extends PaymentProvider {
  constructor(outcome = process.env.MOCK_PAYMENT_OUTCOME || 'success') {
    super();
    this.outcome = outcome;
  }

  async createPayment(order) {
    const providerRef = `mock_${randomUUID()}`;
    const status = this.outcome === 'fail' ? 'FAILED' : this.outcome === 'pending' ? 'PENDING' : 'SUCCESS';
    return {
      status,
      providerRef,
      redirectUrl: `/checkout/mock-result?ref=${providerRef}&status=${status.toLowerCase()}`,
      amount: order.totalAmount,
    };
  }

  async verifyPayment(providerRef) {
    const status = this.outcome === 'fail' ? 'FAILED' : this.outcome === 'pending' ? 'PENDING' : 'SUCCESS';
    return { status, providerRef };
  }
}

module.exports = MockPaymentProvider;
