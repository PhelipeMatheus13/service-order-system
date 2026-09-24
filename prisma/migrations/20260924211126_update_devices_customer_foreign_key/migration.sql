-- DropForeignKey
ALTER TABLE "devices" DROP CONSTRAINT "devices_customer_id_fkey";

-- AddForeignKey
ALTER TABLE "devices" 
ADD CONSTRAINT "devices_customer_id_fkey" 
FOREIGN KEY ("customer_id") 
REFERENCES "customers"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
