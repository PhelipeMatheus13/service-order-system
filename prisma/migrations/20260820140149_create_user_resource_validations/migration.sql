-- CreateEnum
CREATE TYPE "user_resource_validation_type" AS ENUM ('EMAIL');

-- CreateTable
CREATE TABLE "user_resource_validations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource_type" "user_resource_validation_type" NOT NULL,
    "challenger_number" VARCHAR(6) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,

    CONSTRAINT "user_resource_validations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_resource_validations"
ADD CONSTRAINT "user_resource_validations_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_user_validations_user_type_created"
ON "user_resource_validations" ("user_id", "resource_type", "created_at" DESC);

CREATE INDEX "idx_user_validations_active_email"
ON "user_resource_validations" ("user_id", "resource_type", "expires_at")
WHERE "confirmed_at" IS NULL AND "resource_type" = 'EMAIL';