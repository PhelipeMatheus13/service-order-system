-- CreateEnum
CREATE TYPE "quote_status_enum" AS ENUM (
    'DRAFT',
    'SENT', 
    'DECIDED', 
    'SUPERSEDED'
);

-- CreateEnum
CREATE TYPE "quote_item_decision_enum" AS ENUM (
    'PENDING',
    'APPROVED',
    'DECLINED'
);

-- CreateEnum
CREATE TYPE "quote_item_component_type_enum" AS ENUM (
    'PART',
    'LABOR',
    'OTHER'
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_order_id" UUID NOT NULL,
    "diagnosis_id" UUID,
    "status" "quote_status_enum" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "finding_id" UUID,
    "description" TEXT NOT NULL,
    "decision" "quote_item_decision_enum" NOT NULL DEFAULT 'PENDING',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_item_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_item_id" UUID NOT NULL,
    "type" "quote_item_component_type_enum" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "quote_item_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotes_service_order_id_idx" ON "quotes"("service_order_id");
CREATE INDEX "quotes_diagnosis_id_idx" ON "quotes"("diagnosis_id");
CREATE INDEX "quotes_created_by_idx" ON "quotes"("created_by");
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");
CREATE INDEX "quote_items_finding_id_idx" ON "quote_items"("finding_id");
CREATE INDEX "quote_items_created_by_idx" ON "quote_items"("created_by");
CREATE INDEX "quote_items_updated_by_idx" ON "quote_items"("updated_by");
CREATE INDEX "quote_item_components_quote_item_id_idx" ON "quote_item_components"("quote_item_id");

-- CreateIndex (partial unique: at most one non-superseded quote per service order)
CREATE UNIQUE INDEX "quotes_one_current_per_service_order_key"
    ON "quotes" ("service_order_id")
    WHERE "status" <> 'SUPERSEDED';


-- AddForeignKey
ALTER TABLE "quotes" 
ADD CONSTRAINT "quotes_service_order_id_fkey" 
FOREIGN KEY ("service_order_id") 
REFERENCES "service_orders"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" 
ADD CONSTRAINT "quotes_diagnosis_id_fkey" 
FOREIGN KEY ("diagnosis_id") 
REFERENCES "diagnoses"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" 
ADD CONSTRAINT "quotes_created_by_fkey" 
FOREIGN KEY ("created_by") 
REFERENCES "users"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" 
ADD CONSTRAINT "quote_items_quote_id_fkey" 
FOREIGN KEY ("quote_id") 
REFERENCES "quotes"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" 
ADD CONSTRAINT "quote_items_finding_id_fkey" 
FOREIGN KEY ("finding_id") 
REFERENCES "findings"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" 
ADD CONSTRAINT "quote_items_created_by_fkey" 
FOREIGN KEY ("created_by") 
REFERENCES "users"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" 
ADD CONSTRAINT "quote_items_updated_by_fkey" 
FOREIGN KEY ("updated_by") 
REFERENCES "users"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_item_components" 
ADD CONSTRAINT "quote_item_components_quote_item_id_fkey" 
FOREIGN KEY ("quote_item_id") 
REFERENCES "quote_items"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;


