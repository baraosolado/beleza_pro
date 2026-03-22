-- AlterTable
ALTER TABLE "users" ADD COLUMN     "business_category" VARCHAR(100),
ADD COLUMN     "business_instagram" VARCHAR(100),
ADD COLUMN     "business_email" VARCHAR(255),
ADD COLUMN     "business_phone" VARCHAR(20),
ADD COLUMN     "business_pix_key" VARCHAR(255),
ADD COLUMN     "business_address" TEXT;
