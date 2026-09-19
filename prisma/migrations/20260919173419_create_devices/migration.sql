-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "model" VARCHAR(255) NOT NULL,
    "color" VARCHAR(100) NOT NULL,
    "serial_number" VARCHAR(255),
    "imei" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_number_key" ON "devices"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "devices_imei_key" ON "devices"("imei");

-- CreateIndex
CREATE INDEX "devices_customer_id_idx" ON "devices"("customer_id");

-- CreateIndex
CREATE INDEX "devices_created_at_idx" ON "devices"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
