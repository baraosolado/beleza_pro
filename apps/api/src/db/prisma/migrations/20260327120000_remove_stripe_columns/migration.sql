-- Remove integração Stripe (cobranças ficam só como controle interno).
ALTER TABLE "charges" DROP COLUMN IF EXISTS "stripe_payment_intent_id";
ALTER TABLE "charges" DROP COLUMN IF EXISTS "stripe_pix_qrcode";
ALTER TABLE "charges" DROP COLUMN IF EXISTS "stripe_pix_copy_paste";
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id";
