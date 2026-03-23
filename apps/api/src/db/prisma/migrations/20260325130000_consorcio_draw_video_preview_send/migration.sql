-- AlterTable
ALTER TABLE "consorcio_draws" ADD COLUMN "video_preview_base64" TEXT;
ALTER TABLE "consorcio_draws" ADD COLUMN "video_preview_mime" VARCHAR(100);
ALTER TABLE "consorcio_draws" ADD COLUMN "whatsapp_dispatch_pending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "consorcio_draws" ADD COLUMN "winner_participant_id" UUID;
