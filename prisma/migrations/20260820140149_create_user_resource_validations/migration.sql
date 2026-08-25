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

-- Create function
CREATE OR REPLACE FUNCTION set_user_resource_validation_expires_at()
RETURNS trigger AS
$$
BEGIN
    NEW.expires_at := NEW.created_at + INTERVAL '10 minutes';
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_expires_at_before_insert_user_resource_validation
BEFORE INSERT ON user_resource_validations
FOR EACH ROW
EXECUTE FUNCTION set_user_resource_validation_expires_at();