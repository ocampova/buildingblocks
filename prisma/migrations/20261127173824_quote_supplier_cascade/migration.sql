-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_supplierId_fkey";

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
