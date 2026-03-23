-- CreateEnum
CREATE TYPE "ConsorcioParticipantStatus" AS ENUM ('elegivel', 'sorteada');

-- CreateTable
CREATE TABLE "consorcio_settings" (
    "user_id" UUID NOT NULL,
    "cycle_name" VARCHAR(200) NOT NULL DEFAULT 'Ciclo atual',
    "draw_day_of_month" INTEGER NOT NULL DEFAULT 10,
    "reminder_day_of_month" INTEGER NOT NULL DEFAULT 20,
    "reminder_time" VARCHAR(8) NOT NULL DEFAULT '09:00',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consorcio_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "consorcio_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "ConsorcioParticipantStatus" NOT NULL DEFAULT 'elegivel',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consorcio_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consorcio_draws" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "drawn_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "winner_name" VARCHAR(255) NOT NULL,
    "participant_count" INTEGER NOT NULL,
    "triggered_by" VARCHAR(20) NOT NULL,
    "video_url" TEXT,

    CONSTRAINT "consorcio_draws_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consorcio_participants_user_id_client_id_key" ON "consorcio_participants"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "consorcio_participants_user_id_idx" ON "consorcio_participants"("user_id");

-- CreateIndex
CREATE INDEX "consorcio_draws_user_id_drawn_at_idx" ON "consorcio_draws"("user_id", "drawn_at" DESC);

-- AddForeignKey
ALTER TABLE "consorcio_settings" ADD CONSTRAINT "consorcio_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consorcio_participants" ADD CONSTRAINT "consorcio_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consorcio_participants" ADD CONSTRAINT "consorcio_participants_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consorcio_draws" ADD CONSTRAINT "consorcio_draws_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
