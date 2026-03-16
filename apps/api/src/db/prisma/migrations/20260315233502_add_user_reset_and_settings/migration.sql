-- AlterTable
ALTER TABLE "users" ADD COLUMN     "business_name" VARCHAR(255),
ADD COLUMN     "reset_password_expires_at" TIMESTAMPTZ,
ADD COLUMN     "reset_password_token" VARCHAR(255),
ADD COLUMN     "working_hours" JSONB;
