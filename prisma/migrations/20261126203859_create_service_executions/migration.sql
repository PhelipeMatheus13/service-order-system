-- CreateTable
CREATE TABLE "service_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_order_id" UUID NOT NULL,
    "performed_by" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "service_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executed_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_execution_id" UUID NOT NULL,
    "quote_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "executed_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_executions_service_order_id_idx" ON "service_executions"("service_order_id");
CREATE INDEX "service_executions_performed_by_idx" ON "service_executions"("performed_by");
CREATE UNIQUE INDEX "executed_items_quote_item_id_key" ON "executed_items"("quote_item_id");
CREATE INDEX "executed_items_service_execution_id_idx" ON "executed_items"("service_execution_id");

-- AddForeignKey
ALTER TABLE "service_executions" 
ADD CONSTRAINT "service_executions_service_order_id_fkey" 
FOREIGN KEY ("service_order_id") 
REFERENCES "service_orders"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_executions" 
ADD CONSTRAINT "service_executions_performed_by_fkey" 
FOREIGN KEY ("performed_by") 
REFERENCES "users"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executed_items" 
ADD CONSTRAINT "executed_items_service_execution_id_fkey" 
FOREIGN KEY ("service_execution_id") 
REFERENCES "service_executions"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executed_items" 
ADD CONSTRAINT "executed_items_quote_item_id_fkey" 
FOREIGN KEY ("quote_item_id") 
REFERENCES "quote_items"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
