-- AlterTable (defensivo: pode rodar antes da criação de consorcio_settings no shadow DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'consorcio_settings'
  ) THEN
    ALTER TABLE "consorcio_settings" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "consorcio_pdfs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "file_name" VARCHAR(255),
    "mime" VARCHAR(50) NOT NULL,
    "pdf_base64" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consorcio_pdfs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consorcio_pdfs_user_id_created_at_idx" ON "consorcio_pdfs"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "consorcio_pdfs" ADD CONSTRAINT "consorcio_pdfs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
