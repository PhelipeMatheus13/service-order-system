-- CreateTable
CREATE TABLE "user_activation_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "jti" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,

    CONSTRAINT "user_activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_activation_tokens_jti_key" ON "user_activation_tokens"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "user_activation_tokens_token_hash_key" ON "user_activation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "user_activation_tokens_expires_at_idx" ON "user_activation_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "user_activation_tokens" ADD CONSTRAINT "user_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
