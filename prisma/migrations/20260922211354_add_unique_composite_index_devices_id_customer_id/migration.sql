-- CreateIndex
CREATE UNIQUE INDEX "devices_id_customer_id_key" ON "devices"("id", "customer_id");
