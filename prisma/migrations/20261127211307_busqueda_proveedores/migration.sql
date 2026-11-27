-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "supplierSearch" JSONB,
ADD COLUMN     "supplierSearchAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "location" TEXT;
