-- Garante default em updated_at para quem já aplicou a migration anterior sem DEFAULT
ALTER TABLE "consorcio_settings" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
