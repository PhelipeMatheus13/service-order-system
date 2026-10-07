-- CreateEnum
CREATE TYPE "service_order_status_enum" AS ENUM (
    'WAITING_DIAGNOSIS',
    'IN_DIAGNOSIS', 
    'AWAITING_QUOTE', 
    'AWAITING_APPROVAL', 
    'AWAITING_MAINTENANCE', 
    'IN_MAINTENANCE', 
    'AWAITING_DELIVERY', 
    'DELIVERED', 
    'CANCELLED'
);

-- CreateEnum
CREATE TYPE "service_order_status_change_source_enum" AS ENUM ('USER', 'SYSTEM');

-- CreateTable
CREATE TABLE "service_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "reported_problem" TEXT NOT NULL,
    "status" "service_order_status_enum" NOT NULL DEFAULT 'WAITING_DIAGNOSIS',
    "created_by" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_order_id" UUID NOT NULL,
    "from_status" "service_order_status_enum",
    "to_status" "service_order_status_enum" NOT NULL,
    "change_source" "service_order_status_change_source_enum" NOT NULL,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_orders_customer_id_idx" ON "service_orders"("customer_id");

-- CreateIndex
CREATE INDEX "service_orders_device_id_idx" ON "service_orders"("device_id");

-- CreateIndex
CREATE INDEX "service_orders_status_created_at_idx" ON "service_orders"("status", "created_at" DESC);

-- CreateIndex (allows only one active service order per device)
CREATE UNIQUE INDEX "service_orders_one_active_per_device"
ON "service_orders" ("device_id")
WHERE "finished_at" IS NULL;

-- CreateIndex
CREATE INDEX "service_order_status_history_service_order_id_created_at_idx" ON "service_order_status_history"("service_order_id", "created_at" DESC);

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

-- AddForeignKey
ALTER TABLE "service_order_status_history" 
ADD CONSTRAINT "service_order_status_history_service_order_id_fkey" 
FOREIGN KEY ("service_order_id") 
REFERENCES "service_orders"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_status_history" 
ADD CONSTRAINT "service_order_status_history_changed_by_fkey" 
FOREIGN KEY ("changed_by") 
REFERENCES "users"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;