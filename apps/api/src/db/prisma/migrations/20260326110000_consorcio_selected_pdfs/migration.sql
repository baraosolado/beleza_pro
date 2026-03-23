ALTER TABLE "consorcio_settings"
ADD COLUMN "selected_pdf_ids" JSONB NOT NULL DEFAULT '[]'::jsonb;
