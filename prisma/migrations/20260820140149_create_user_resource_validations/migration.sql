-- CreateEnum
CREATE TYPE "user_resource_validation_type" AS ENUM ('EMAIL', 'PHONE');

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