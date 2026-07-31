// Iran's current standard VAT rate (مالیات بر ارزش افزوده). Kept as a single
// constant since the law has changed it before and likely will again — every
// invoice also stores the rate it was actually issued at, so past invoices
// stay correct even if this changes later.
const VAT_RATE = 9;

function computeInvoiceTotals(order) {
  const subtotal = Number(order.totalAmount) + Number(order.discountAmount || 0);
  const discountTotal = Number(order.discountAmount || 0);
  // VAT computed on the post-discount (actually paid) amount.
  const vatBase = Number(order.totalAmount);
  const vatAmount = Math.round((vatBase * VAT_RATE) / 100);
  const totalAmount = vatBase + vatAmount;
  return { subtotal, discountTotal, vatRate: VAT_RATE, vatAmount, totalAmount };
}

module.exports = { VAT_RATE, computeInvoiceTotals };
