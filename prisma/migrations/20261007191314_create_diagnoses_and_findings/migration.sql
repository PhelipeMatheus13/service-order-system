-- CreateEnum
CREATE TYPE "diagnosis_result_enum" AS ENUM ('FAULT_FOUND', 'NO_FAULT_FOUND', 'INCONCLUSIVE');

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_order_id" UUID NOT NULL,
    "performed_by" UUID NOT NULL,
    "result" "diagnosis_result_enum",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "diagnosis_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "repairable" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnoses_performed_by_idx" ON "diagnoses"("performed_by");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_service_order_id_key" ON "diagnoses"("service_order_id");

-- CreateIndex
CREATE INDEX "findings_diagnosis_id_idx" ON "findings"("diagnosis_id");

-- AddForeignKey
ALTER TABLE "diagnoses" 
ADD CONSTRAINT "diagnoses_service_order_id_fkey" 
FOREIGN KEY ("service_order_id") 
REFERENCES "service_orders"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" 
ADD CONSTRAINT "diagnoses_performed_by_fkey" 
FOREIGN KEY ("performed_by") 
REFERENCES "users"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" 
ADD CONSTRAINT "findings_diagnosis_id_fkey" 
FOREIGN KEY ("diagnosis_id") 
REFERENCES "diagnoses"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
