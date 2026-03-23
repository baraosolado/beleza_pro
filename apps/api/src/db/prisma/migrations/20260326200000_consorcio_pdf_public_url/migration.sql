-- AlterTable: URL pública (n8n + MinIO); base64 opcional (legado)
ALTER TABLE "consorcio_pdfs" ADD COLUMN "public_url" TEXT;
ALTER TABLE "consorcio_pdfs" ALTER COLUMN "pdf_base64" DROP NOT NULL;
