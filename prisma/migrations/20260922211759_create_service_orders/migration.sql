-- CreateEnum
CREATE TYPE "service_order_status_enum" AS ENUM ('RECEIVED', 'IN_DIAGNOSIS', 'DIAGNOSIS_COMPLETED', 'AWAITING_APPROVAL', 'IN_MAINTENANCE', 'FINALIZED', 'AWAITING_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "service_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "reported_problem" TEXT NOT NULL,
    "status" "service_order_status_enum" NOT NULL DEFAULT 'RECEIVED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_orders_customer_id_idx" ON "service_orders"("customer_id");
CREATE INDEX "service_orders_device_id_idx" ON "service_orders"("device_id");
CREATE INDEX "service_orders_status_created_at_idx" ON "service_orders"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_device_id_customer_id_fkey"
FOREIGN KEY ("device_id", "customer_id")
REFERENCES "devices"("id", "customer_id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders"
ADD CONSTRAINT "service_orders_created_by_fkey"
FOREIGN KEY ("created_by")
REFERENCES "users"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;