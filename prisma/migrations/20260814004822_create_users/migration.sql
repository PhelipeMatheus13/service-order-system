-- CreateEnum
CREATE TYPE "role_enum" AS ENUM ('ADMIN', 'ATTENDANT', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "outbox_action_status" AS ENUM ('DELETE', 'UPDATE', 'INSERT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(15),
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255),
    "role" "role_enum" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_users" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "outbox_action_status" NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ,

    CONSTRAINT "outbox_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users" ("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");

-- CreateIndex
CREATE INDEX "outbox_users_unconsumed_created_idx" ON "outbox_users" ("created_at" ASC) WHERE "consumed_at" IS NULL;

-- CreateFunction
CREATE OR REPLACE FUNCTION create_user_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO "outbox_users" (
        "user_id",
        "action",
        "before_state",
        "after_state"
    )
    VALUES (
        NEW."id",
        'INSERT',
        NULL,
        jsonb_build_object(
            'id', NEW."id",
            'first_name', NEW."first_name",
            'last_name', NEW."last_name",
            'phone_number', NEW."phone_number",
            'email', NEW."email",
            'role', NEW."role",
            'active', NEW."active",
            'created_at', NEW."created_at",
            'updated_at', NEW."updated_at"
        )
    );
    RETURN NEW;
END;
$$;

-- CreateTrigger
CREATE TRIGGER "users_after_insert"
AFTER INSERT ON "users"
FOR EACH ROW
EXECUTE FUNCTION create_user_outbox();