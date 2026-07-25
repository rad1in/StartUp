-- The customer delivery-address feature was never wired into any actual
-- delivery order flow (no DELIVERY order type, no courier/dispatch) — it was
-- a half-built stub. Removing it entirely rather than leaving dead code.
DROP TABLE IF EXISTS `Address`;
