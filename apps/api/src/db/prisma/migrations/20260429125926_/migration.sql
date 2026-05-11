-- AlterTable
ALTER TABLE "consorcio_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT;
